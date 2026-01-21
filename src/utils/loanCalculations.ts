
import { PartPayment } from "@/components/PartPaymentSection";

interface LoanCalculationResult {
  emi: number;
  totalInterest: number;
  totalAmount: number;
  schedule: {
    month: number;
    year: number;
    emiAmount: number;
    principalAmount: number;
    interestAmount: number;
    remainingBalance: number;
    partPayment: number;
  }[];
  chartData: {
    year: number;
    remainingBalance: number;
    principalPaid: number;
  }[];
}

export const calculateLoanEMI = (
  principal: number,
  annualRate: number,
  tenureYears: number,
  startMonth: number,
  startYear: number,
  partPayments: PartPayment[] = []
): LoanCalculationResult => {
  // Input validation to prevent invalid calculations
  if (!isFinite(principal) || principal <= 0) {
    throw new Error('Principal must be a positive number');
  }
  if (!isFinite(annualRate) || annualRate < 0) {
    throw new Error('Annual rate must be a non-negative number');
  }
  if (!isFinite(tenureYears) || tenureYears <= 0) {
    throw new Error('Tenure must be a positive number');
  }
  if (startMonth < 1 || startMonth > 12 || !Number.isInteger(startMonth)) {
    throw new Error('Start month must be an integer between 1 and 12');
  }
  if (!Number.isInteger(startYear) || startYear < 1900 || startYear > 2200) {
    throw new Error('Start year must be a valid year');
  }

  // Apply reasonable bounds to prevent overflow
  const safePrincipal = Math.min(principal, 1e12); // Cap at 1 trillion
  const safeRate = Math.min(annualRate, 100); // Cap at 100% annual rate
  const safeTenure = Math.min(tenureYears, 50); // Cap at 50 years

  const monthlyRate = safeRate / 12 / 100;
  const totalMonths = safeTenure * 12;
  
  // Calculate EMI using the formula: EMI = P × r × (1+r)^n / ((1+r)^n - 1)
  // Handle zero interest rate special case
  let emi: number;
  if (monthlyRate === 0) {
    // Zero interest: simple division
    emi = safePrincipal / totalMonths;
  } else {
    const factor = Math.pow(1 + monthlyRate, totalMonths);
    // Validate factor to prevent division by zero or overflow
    if (!isFinite(factor) || factor <= 1) {
      throw new Error('Invalid calculation parameters - values cause mathematical overflow');
    }
    emi = safePrincipal * monthlyRate * factor / (factor - 1);
  }

  // Validate EMI result
  if (!isFinite(emi) || emi <= 0) {
    throw new Error('Invalid EMI calculation result');
  }

  let remainingBalance = safePrincipal;
  let totalInterestPaid = 0;
  const schedule = [];
  const chartData = [];
  
  // Expand recurring part payments into individual monthly payments with strategy
  const expandedPartPayments: Array<{ month: number; year: number; amount: number; strategy: 'reduce-tenure' | 'reduce-emi' }> = [];
  
  partPayments.forEach(payment => {
    const startDate = new Date(payment.year, payment.month - 1);
    const endDate = new Date(startYear + tenureYears, startMonth - 1);
    
    if (payment.frequency === 'one-time') {
      expandedPartPayments.push({
        month: payment.month,
        year: payment.year,
        amount: payment.amount,
        strategy: payment.strategy
      });
    } else {
      let currentDate = new Date(startDate);
      const monthIncrement = payment.frequency === 'monthly' ? 1 : 
                            payment.frequency === 'quarterly' ? 3 :
                            payment.frequency === 'half-yearly' ? 6 : 12;
      
      while (currentDate <= endDate) {
        expandedPartPayments.push({
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
          amount: payment.amount,
          strategy: payment.strategy
        });
        currentDate.setMonth(currentDate.getMonth() + monthIncrement);
      }
    }
  });
  
  // Sort expanded part payments by date for easier lookup
  const sortedPartPayments = expandedPartPayments.sort((a, b) => {
    const dateA = new Date(a.year, a.month - 1);
    const dateB = new Date(b.year, b.month - 1);
    return dateA.getTime() - dateB.getTime();
  });

  let currentDate = new Date(startYear, startMonth - 1, 1);
  let monthCount = 0;
  let principalPaidTotal = 0;
  let currentEMI = emi; // Track current EMI
  const originalEndDate = new Date(startYear, startMonth - 1);
  originalEndDate.setMonth(originalEndDate.getMonth() + totalMonths);
  
  // Track if we're in reduce-emi mode (any part payment with reduce-emi strategy)
  const hasReduceEMIPayments = sortedPartPayments.some(pp => pp.strategy === 'reduce-emi');
  
  // Track the adjusted end date after reduce-tenure payments
  let adjustedEndDate = new Date(originalEndDate);

  while (remainingBalance > 0.01 && (hasReduceEMIPayments ? currentDate < originalEndDate : monthCount < totalMonths)) {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Calculate interest for current month
    const interestAmount = remainingBalance * monthlyRate;
    let principalAmount = currentEMI - interestAmount;
    
    // Check if there are part payments this month (sum all payments for this month)
    const partPaymentsThisMonth = sortedPartPayments.filter(
      pp => pp.year === currentYear && pp.month === currentMonth
    );
    
    let emiForThisMonth = currentEMI;
    let partPaymentAmount = 0;
    
    if (partPaymentsThisMonth.length > 0) {
      partPaymentAmount = partPaymentsThisMonth.reduce((sum, pp) => sum + pp.amount, 0);
      if (import.meta.env.DEV) {
        console.log(`Part payment found for ${currentMonth}/${currentYear}: ₹${partPaymentAmount}`);
      }
    }
    
    // Ensure we don't pay more principal than remaining balance
    if (principalAmount > remainingBalance) {
      principalAmount = remainingBalance;
      emiForThisMonth = interestAmount + principalAmount;
    }
    
    // Apply principal payment and part payment to remaining balance
    // Ensure part payment doesn't exceed remaining balance
    const effectivePartPayment = Math.min(partPaymentAmount, Math.max(0, remainingBalance - principalAmount));
    remainingBalance -= (principalAmount + effectivePartPayment);
    totalInterestPaid += interestAmount;
    principalPaidTotal += (principalAmount + effectivePartPayment);
    
    // Recalculate EMI only for reduce-emi strategy part payments
    if (partPaymentAmount > 0) {
      // Check if any part payment this month has 'reduce-emi' strategy
      const hasReduceEMIPayment = partPaymentsThisMonth.some(pp => pp.strategy === 'reduce-emi');
      const hasReduceTenurePayment = partPaymentsThisMonth.some(pp => pp.strategy === 'reduce-tenure');
      
      // Update adjusted end date for reduce-tenure payments
      if (hasReduceTenurePayment && remainingBalance > 0) {
        // Calculate how many months it would take to pay off the remaining balance with current EMI
        const newTenureMonths = Math.log(currentEMI / (currentEMI - remainingBalance * monthlyRate)) / Math.log(1 + monthlyRate);
        adjustedEndDate = new Date(currentDate);
        adjustedEndDate.setMonth(adjustedEndDate.getMonth() + Math.ceil(newTenureMonths));
        if (import.meta.env.DEV) {
          console.log(`Adjusted end date after reduce-tenure: ${adjustedEndDate.toLocaleDateString()} (${Math.ceil(newTenureMonths)} months remaining)`);
        }
      }
      
      // Only recalculate EMI if at least one payment uses reduce-emi strategy
      if (hasReduceEMIPayment) {
        // For reduce-emi: Use adjusted end date (accounts for previous reduce-tenure payments)
        const remainingMonths = Math.ceil((adjustedEndDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
        if (remainingMonths > 1 && remainingBalance > 0) {
          currentEMI = remainingBalance * monthlyRate * Math.pow(1 + monthlyRate, remainingMonths) / 
                      (Math.pow(1 + monthlyRate, remainingMonths) - 1);
          if (import.meta.env.DEV) {
            console.log(`EMI recalculated to: ₹${currentEMI.toFixed(2)} for remaining ${remainingMonths} months (reduce-emi strategy, using adjusted end date)`);
          }
        }
      } else {
        if (import.meta.env.DEV) {
          console.log(`Part payment applied but EMI remains ₹${currentEMI.toFixed(2)} (reduce-tenure strategy)`);
        }
      }
    }
    
    schedule.push({
      month: currentMonth,
      year: currentYear,
      emiAmount: emiForThisMonth,
      principalAmount,
      interestAmount,
      remainingBalance: Math.max(0, remainingBalance),
      partPayment: partPaymentAmount,
    });
    
    // Add to chart data (yearly basis)
    if (currentMonth === 12 || remainingBalance <= 0.01) {
      chartData.push({
        year: currentYear - startYear + 1,
        remainingBalance: Math.max(0, remainingBalance),
        principalPaid: principalPaidTotal,
      });
    }
    
    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
    monthCount++;
  }

  return {
    emi,
    totalInterest: totalInterestPaid,
    totalAmount: safePrincipal + totalInterestPaid,
    schedule,
    chartData,
  };
};
