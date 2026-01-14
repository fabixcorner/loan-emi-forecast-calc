import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ChevronUp, CalendarDays } from "lucide-react";
import calculatorIcon from "@/assets/calculator.png";
import { LoanInputSection } from "@/components/LoanInputSection";
import { PartPaymentSection, PartPayment } from "@/components/PartPaymentSection";
import { LoanSummary } from "@/components/LoanSummary";
import { LoanSummaryCards } from "@/components/LoanSummaryCards";
import { LoanBreakdownChart } from "@/components/LoanBreakdownChart";
import { HowItWorks } from "@/components/HowItWorks";
import { LoanComparisonSection } from "@/components/LoanComparisonSection";
import { LoanAffordabilityCalculator } from "@/components/LoanAffordabilityCalculator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { calculateLoanEMI } from "@/utils/loanCalculations";
import { z } from "zod";

// Schema for validating URL parameters
const PartPaymentSchema = z.object({
  id: z.string(),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  amount: z.number().positive(),
  frequency: z.enum(['one-time', 'monthly', 'quarterly', 'half-yearly', 'yearly']),
  strategy: z.enum(['reduce-tenure', 'reduce-emi']),
  notes: z.string().optional()
});

const PartPaymentsArraySchema = z.array(PartPaymentSchema);

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
  const [activeTab, setActiveTab] = useState("loan-details");
  const [showPartPayments, setShowPartPayments] = useState(false);


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
        const parsed = JSON.parse(payments);
        const validated = PartPaymentsArraySchema.parse(parsed);
        setPartPayments(validated as PartPayment[]);
      } catch (e) {
        // Invalid part payments data in URL - silently ignore and use defaults
        if (import.meta.env.DEV) {
          console.error('Error parsing or validating part payments:', e);
        }
      }
    }
    if (view === 'schedule') {
      setShowSchedule(true);
      setActiveTab("emi-schedule");
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
      <header className="bg-card/80 backdrop-blur-sm shadow-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start space-x-3">
              <div className="p-2 bg-gradient-to-r from-financial-primary to-financial-success rounded-lg">
                <img src={calculatorIcon} alt="Calculator" className="w-10 h-10" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-foreground">
                  {isScheduleView ? 'Shared EMI Schedule' : 'Loan Forecast Calculator'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isScheduleView ? 'View detailed loan repayment schedule' : 'Plan your loan re-payments. Save on interest. Be Smarter than your lender.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <HowItWorks />
            </div>
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
              loanAmount={loanAmount}
              interestRate={interestRate}
              hideActionButtons={true}
            />
          </>
        ) : (
          /* Full calculator view with tabs */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="loan-details" className="text-sm md:text-base">
                Loan Details
              </TabsTrigger>
              <TabsTrigger value="emi-schedule" className="text-sm md:text-base">
                EMI Schedule
              </TabsTrigger>
              <TabsTrigger value="compare-scenarios" className="text-sm md:text-base">
                Compare Scenarios
              </TabsTrigger>
              <TabsTrigger value="loan-affordability" className="text-sm md:text-base">
                Loan Affordability
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Loan Details */}
            <TabsContent value="loan-details" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
              <LoanSummaryCards 
                calculation={calculation} 
                interestSavings={interestSavings} 
                timeSavings={timeSavings}
              />

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => setShowPartPayments(!showPartPayments)}
                  variant="outline"
                  className="gap-2 border-financial-primary text-financial-primary hover:bg-financial-primary hover:text-white transition-all duration-300 relative"
                >
                  {showPartPayments ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Hide Part Payments
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Part Payments
                    </>
                  )}
                  {partPayments.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-financial-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {partPayments.length}
                    </span>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setActiveTab("emi-schedule");
                    setTimeout(() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }, 50);
                  }}
                  variant="outline"
                  className="gap-2 border-financial-success text-financial-success hover:bg-financial-success hover:text-white transition-all duration-300"
                >
                  <CalendarDays className="w-4 h-4" />
                  Show EMI Schedule
                </Button>
              </div>

              {/* Part Payments Section - Conditional */}
              {showPartPayments && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <PartPaymentSection
                    partPayments={partPayments}
                    setPartPayments={setPartPayments}
                    startMonth={startMonth}
                    startYear={startYear}
                    loanTenure={loanTenure}
                    loanSchedule={calculation?.schedule || []}
                  />
                </div>
              )}
            </TabsContent>

            {/* Tab 2: EMI Schedule */}
            <TabsContent value="emi-schedule" className="space-y-8">
              {/* Loan Summary Cards */}
              <LoanSummaryCards 
                calculation={calculation} 
                interestSavings={interestSavings} 
                timeSavings={timeSavings}
              />

              {/* EMI Schedule */}
              <LoanSummary 
                calculation={calculation}
                partPayments={partPayments}
                setPartPayments={setPartPayments}
                startMonth={startMonth}
                startYear={startYear}
                loanTenure={loanTenure}
                showSchedule={true}
                setShowSchedule={setShowSchedule}
                loanAmount={loanAmount}
                interestRate={interestRate}
                hideActionButtons={true}
              />
            </TabsContent>

            {/* Tab 3: Compare Loan Scenarios */}
            <TabsContent value="compare-scenarios" className="space-y-8">
              <LoanComparisonSection
                baseAmount={loanAmount}
                baseRate={interestRate}
                baseTenure={loanTenure}
                basePartPayments={partPayments}
                startMonth={startMonth}
                startYear={startYear}
              />
            </TabsContent>

            {/* Tab 4: Loan Affordability */}
            <TabsContent value="loan-affordability" className="space-y-8">
              <LoanAffordabilityCalculator />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Index;
