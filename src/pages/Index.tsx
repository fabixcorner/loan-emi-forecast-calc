import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calculator, TrendingUp } from "lucide-react";
import calculatorIcon from "@/assets/calculator.png";
import { LoanInputSection } from "@/components/LoanInputSection";
import { PartPaymentSection, PartPayment } from "@/components/PartPaymentSection";
import { LoanSummary } from "@/components/LoanSummary";
import { LoanSummaryCards } from "@/components/LoanSummaryCards";
import { LoanBreakdownChart } from "@/components/LoanBreakdownChart";
import { HowItWorks } from "@/components/HowItWorks";
import { calculateLoanEMI } from "@/utils/loanCalculations";
import confetti from "canvas-confetti";

const Index = () => {
  // Default values
  const [loanAmount, setLoanAmount] = useState(2000000); // 20 lakhs
  const [interestRate, setInterestRate] = useState(8.0);
  const [loanTenure, setLoanTenure] = useState(15);
  const [startMonth, setStartMonth] = useState<number>(new Date().getMonth() + 1);
  const [startYear, setStartYear] = useState<number>(new Date().getFullYear());
  const [partPayments, setPartPayments] = useState<PartPayment[]>([]);
  const [calculation, setCalculation] = useState<any>(null);
  const [calculationWithoutPartPayments, setCalculationWithoutPartPayments] = useState<any>(null);
  const [interestSavings, setInterestSavings] = useState<number>(0);
  const [timeSavings, setTimeSavings] = useState<number>(0);
  const [showSchedule, setShowSchedule] = useState(false);

  const handlePartPaymentAdded = () => {
    // Fire confetti from bottom left corner
    confetti({
      particleCount: 300,
      spread: 70,
      origin: { x: 0, y: 1 },
      angle: 45,
    });
    
    // Fire confetti from bottom right corner
    confetti({
      particleCount: 300,
      spread: 70,
      origin: { x: 1, y: 1 },
      angle: 135,
    });
  };

  // Load data from URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const amount = params.get('amount');
    const rate = params.get('rate');
    const tenure = params.get('tenure');
    const month = params.get('startMonth');
    const year = params.get('startYear');
    const payments = params.get('partPayments');
    const view = params.get('view');

    if (amount) setLoanAmount(Number(amount));
    if (rate) setInterestRate(Number(rate));
    if (tenure) setLoanTenure(Number(tenure));
    if (month) setStartMonth(Number(month));
    if (year) setStartYear(Number(year));
    if (payments) {
      try {
        setPartPayments(JSON.parse(payments));
      } catch (e) {
        console.error('Error parsing part payments:', e);
      }
    }
    if (view === 'schedule') {
      setShowSchedule(true);
    }
  }, []);

  // Auto-calculate whenever loan details or part payments change
  useEffect(() => {
    // Calculate with part payments
    const resultWithPartPayments = calculateLoanEMI(
      loanAmount,
      interestRate,
      loanTenure,
      startMonth,
      startYear,
      partPayments
    );
    setCalculation(resultWithPartPayments);

    // Calculate without part payments (baseline)
    const resultWithoutPartPayments = calculateLoanEMI(
      loanAmount,
      interestRate,
      loanTenure,
      startMonth,
      startYear,
      []
    );
    setCalculationWithoutPartPayments(resultWithoutPartPayments);

    // Calculate savings only if there are part payments
    if (partPayments.length > 0) {
      const savedInterest = resultWithoutPartPayments.totalInterest - resultWithPartPayments.totalInterest;
      const savedMonths = resultWithoutPartPayments.schedule.length - resultWithPartPayments.schedule.length;
      setInterestSavings(savedInterest);
      setTimeSavings(savedMonths);
    } else {
      setInterestSavings(0);
      setTimeSavings(0);
    }
  }, [loanAmount, interestRate, loanTenure, startMonth, startYear, partPayments]);

  const isScheduleView = new URLSearchParams(window.location.search).get('view') === 'schedule';

  return (
    <div className="min-h-screen glass-background">
      {/* Header */}
      <header className="glass-card shadow-sm border-b border-financial-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start space-x-3">
              <div className="p-2 bg-gradient-to-r from-financial-primary to-financial-success rounded-lg">
                <img src={calculatorIcon} alt="Calculator" className="w-10 h-10" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-white">
                  {isScheduleView ? 'Shared EMI Schedule' : 'Loan Forecast Calculator'}
                </h1>
                <p className="text-sm text-white/80">
                  {isScheduleView ? 'View detailed loan repayment schedule' : 'Plan your loan payments. Save on interest. Be Smarter than your lender.'}
                </p>
              </div>
            </div>
            <HowItWorks />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isScheduleView ? (
          /* Schedule-only view for shared links */
          <>
            <div className="mb-8">
              <LoanSummaryCards 
                calculation={calculation} 
                interestSavings={interestSavings}
                timeSavings={timeSavings}
              />
            </div>
            <LoanSummary 
              calculation={calculation}
              partPayments={partPayments}
              setPartPayments={setPartPayments}
              startMonth={startMonth}
              startYear={startYear}
              loanTenure={loanTenure}
              showSchedule={showSchedule}
              setShowSchedule={setShowSchedule}
              onPartPaymentAdded={handlePartPaymentAdded}
              loanAmount={loanAmount}
              interestRate={interestRate}
            />
          </>
        ) : (
          /* Full calculator view */
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Left Section - Loan Inputs */}
                <LoanInputSection
                  loanAmount={loanAmount}
                  setLoanAmount={setLoanAmount}
                  interestRate={interestRate}
                  setInterestRate={setInterestRate}
                  loanTenure={loanTenure}
                  setLoanTenure={setLoanTenure}
                  startMonth={startMonth}
                  setStartMonth={setStartMonth}
                  startYear={startYear}
                  setStartYear={setStartYear}
                />

              {/* Right Section - Loan Breakdown Chart */}
              <LoanBreakdownChart calculation={calculation} showSchedule={showSchedule} />
            </div>

            {/* Loan Summary Cards */}
            <div className="mb-8">
              <LoanSummaryCards 
                calculation={calculation} 
                interestSavings={interestSavings}
                timeSavings={timeSavings}
              />
            </div>

            {/* Loan Summary */}
            <LoanSummary 
              calculation={calculation}
              partPayments={partPayments}
              setPartPayments={setPartPayments}
              startMonth={startMonth}
              startYear={startYear}
              loanTenure={loanTenure}
              showSchedule={showSchedule}
              setShowSchedule={setShowSchedule}
              onPartPaymentAdded={handlePartPaymentAdded}
              loanAmount={loanAmount}
              interestRate={interestRate}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
