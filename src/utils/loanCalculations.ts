
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
  const monthlyRate = annualRate / 12 / 100;
  const totalMonths = tenureYears * 12;
  
  // Calculate EMI using the formula: EMI = P × r × (1+r)^n / ((1+r)^n - 1)
  const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths) / 
              (Math.pow(1 + monthlyRate, totalMonths) - 1);

  let remainingBalance = principal;
  let totalInterestPaid = 0;
  const schedule = [];
  const chartData = [];
  
  // Expand recurring part payments into individual monthly payments
  const expandedPartPayments: Array<{ month: number; year: number; amount: number }> = [];
  
  partPayments.forEach(payment => {
    const startDate = new Date(payment.year, payment.month - 1);
    const endDate = new Date(startYear + tenureYears, startMonth - 1);
    
    if (payment.frequency === 'one-time') {
      expandedPartPayments.push({
        month: payment.month,
        year: payment.year,
        amount: payment.amount
      });
    } else {
      let currentDate = new Date(startDate);
      const monthIncrement = payment.frequency === 'monthly' ? 1 : 
                            payment.frequency === 'quarterly' ? 3 : 12;
      
      while (currentDate <= endDate) {
        expandedPartPayments.push({
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
          amount: payment.amount
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

  while (remainingBalance > 0.01 && monthCount < totalMonths) {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Calculate interest for current month
    const interestAmount = remainingBalance * monthlyRate;
    let principalAmount = emi - interestAmount;
    
    // Check if there are part payments this month (sum all payments for this month)
    const partPaymentsThisMonth = sortedPartPayments.filter(
      pp => pp.year === currentYear && pp.month === currentMonth
    );
    
    let emiForThisMonth = emi;
    let partPaymentAmount = 0;
    
    if (partPaymentsThisMonth.length > 0) {
      partPaymentAmount = partPaymentsThisMonth.reduce((sum, pp) => sum + pp.amount, 0);
      console.log(`Part payment found for ${currentMonth}/${currentYear}: ₹${partPaymentAmount}`);
    }
    
    // Ensure we don't pay more principal than remaining balance
    if (principalAmount > remainingBalance) {
      principalAmount = remainingBalance;
      emiForThisMonth = interestAmount + principalAmount;
    }
    
    // Apply part payment separately to remaining balance
    remainingBalance -= (principalAmount + partPaymentAmount);
    totalInterestPaid += interestAmount;
    principalPaidTotal += (principalAmount + partPaymentAmount);
    
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
    totalAmount: principal + totalInterestPaid,
    schedule,
    chartData,
  };
};
