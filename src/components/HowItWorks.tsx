import { useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle, X, Calendar, TrendingDown, Wallet, ArrowLeft, Scale, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Question {
  id: string;
  title: string;
  icon: any;
  content: {
    steps: string[];
    visual: string;
  };
}

const questions: Question[] = [
  {
    id: "calculate-emi",
    title: "How to calculate EMI, interest and total payable amount?",
    icon: Wallet,
    content: {
      steps: [
        "Enter your loan amount in the 'Loan Amount' field",
        "Set the annual interest rate in the 'Interest Rate' field",
        "Choose your loan tenure in years",
        "The calculator instantly shows your monthly EMI, total interest, and total amount payable in the summary cards below",
      ],
      visual: "The summary cards display: Monthly EMI, Total Interest, and Total Amount. All calculations update automatically as you adjust any value.",
    },
  },
  {
    id: "view-schedule",
    title: "How to see the EMI schedule of a loan summary?",
    icon: Calendar,
    content: {
      steps: [
        "Scroll down to the 'Loan Summary' section after entering your loan details",
        "Click the 'View Schedule' button to expand the detailed payment schedule",
        "The schedule shows month-by-month breakdown of principal, interest, and remaining balance",
        "You can export this schedule to Excel or PDF using the export buttons",
        "Share the schedule with others using the 'Share Schedule' button",
      ],
      visual: "The EMI schedule table displays each month's payment breakdown, showing how your loan balance decreases over time with each payment.",
    },
  },
  {
    id: "part-payments-tenure",
    title: "How to benefit by making part payment to reduce loan tenure?",
    icon: TrendingDown,
    content: {
      steps: [
        "Scroll to the 'Part Payment' section in the Loan Summary area",
        "Click 'Add Part Payment' to schedule an additional payment",
        "Choose the month/year and amount for your part payment",
        "Select 'Reduce Tenure' as the adjustment strategy",
        "Your EMI stays the same, but loan tenure decreases significantly",
        "Watch the time savings and interest savings update in real-time!",
      ],
      visual: "With 'Reduce Tenure' strategy, your monthly EMI remains unchanged while the loan duration shortens. This is ideal if you want to become debt-free faster and save maximum interest over the loan period.",
    },
  },
  {
    id: "part-payments-emi",
    title: "How to benefit by making part payment to reduce monthly EMI?",
    icon: Wallet,
    content: {
      steps: [
        "Scroll to the 'Part Payment' section in the Loan Summary area",
        "Click 'Add Part Payment' to schedule an additional payment",
        "Choose the month/year and amount for your part payment",
        "Select 'Reduce EMI' as the adjustment strategy",
        "Your loan tenure stays the same, but monthly EMI decreases",
        "See the reduced EMI amount reflected in your payment schedule!",
      ],
      visual: "With 'Reduce EMI' strategy, your loan duration remains the same while monthly payments become lighter. This is ideal if you want to improve monthly cash flow while still saving on interest.",
    },
  },
  {
    id: "loan-comparison",
    title: "How to compare multiple loan scenarios side by side?",
    icon: Scale,
    content: {
      steps: [
        "Navigate to the 'Loan Comparison' tab at the top of the calculator",
        "Your current loan details are automatically loaded as the base scenario",
        "Click 'Add Scenario' to create additional loan scenarios (up to 3 total)",
        "Adjust the loan amount, interest rate, or tenure for each scenario",
        "Compare key metrics like EMI, total interest, and total payment side by side",
        "Use color-coded highlights to identify the best values across scenarios",
      ],
      visual: "The comparison view strips all part payments to provide a standardized baseline. Green highlights indicate the best values, while red highlights show higher costs relative to your base scenario.",
    },
  },
  {
    id: "loan-affordability",
    title: "How to check loan affordability based on my income?",
    icon: Calculator,
    content: {
      steps: [
        "Navigate to the 'Loan Affordability' tab at the top of the calculator",
        "Enter your monthly gross income in the income field",
        "Set the expected interest rate and preferred loan tenure",
        "Add any existing monthly EMIs you're currently paying",
        "Optionally enable credit score input to refine eligibility",
        "Select your employment type (Salaried/Self-employed) for accurate calculations",
        "Enter the property value to apply Loan-to-Value (LTV) limits",
      ],
      visual: "The calculator uses a 50% Fixed Obligations to Income Ratio (FOIR) to determine your eligible loan amount. Credit score multipliers and employment factors further refine the calculation for realistic eligibility.",
    },
  },
];

export const HowItWorks = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleQuestionClick = (question: Question) => {
    setSelectedQuestion(question);
    setIsFlipped(true);
  };

  const handleBack = () => {
    setIsFlipped(false);
    setTimeout(() => setSelectedQuestion(null), 300);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-foreground hover:bg-muted text-center leading-tight sm:leading-normal h-auto py-1 sm:py-2"
      >
        <HelpCircle className="sm:mr-2 h-4 w-4 flex-shrink-0" />
        <span className="hidden sm:inline whitespace-nowrap">How it works?</span>
      </Button>

      {isOpen && createPortal(
        <>
          {/* Backdrop blur - covers entire page and prevents interaction */}
          <div 
            className="dark fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] animate-in fade-in"
            onClick={() => {
              setIsOpen(false);
              setIsFlipped(false);
              setSelectedQuestion(null);
            }}
            style={{ pointerEvents: 'auto' }}
          />
          
          {/* Flip card container - always dark theme */}
          <div className="dark fixed left-0 right-0 top-24 z-[10000] flex justify-center px-4 pb-4 overflow-y-auto max-h-[calc(100vh-6rem)]" style={{ pointerEvents: 'none' }}>
            <div 
              className="relative max-w-2xl w-full h-[600px]"
              style={{ 
                pointerEvents: 'auto',
                perspective: '1000px'
              }}
            >
              <div 
                className={`relative w-full h-full transition-transform duration-700 ease-in-out`}
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
              >
                {/* Front - Questions List */}
                <div 
                  className="absolute inset-0 glass-card p-6 space-y-4 animate-in slide-in-from-top fade-in duration-300"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden'
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-white">How it works?</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setIsOpen(false);
                        setIsFlipped(false);
                        setSelectedQuestion(null);
                      }}
                      className="text-white hover:bg-white/10"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <div className="grid gap-4 overflow-y-auto max-h-[500px] pr-2">
                    {questions.map((question, index) => {
                      const Icon = question.icon;
                      return (
                        <button
                          key={question.id}
                          onClick={() => handleQuestionClick(question)}
                          className="w-full text-left p-5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:border-financial-primary/50 hover:scale-[1.02] group animate-in slide-in-from-bottom duration-300"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="p-3 rounded-lg bg-gradient-to-br from-financial-primary to-financial-success flex-shrink-0">
                              <Icon className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-base font-medium text-white group-hover:text-financial-primary transition-colors leading-relaxed">
                                {question.title}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Back - Answer Details */}
                <div 
                  className="absolute inset-0 glass-card p-6 overflow-y-auto"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  {selectedQuestion && (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleBack}
                          className="text-white hover:bg-white/10"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back to questions
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setIsOpen(false);
                            setIsFlipped(false);
                            setSelectedQuestion(null);
                          }}
                          className="text-white hover:bg-white/10"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>

                      <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-financial-primary to-financial-success">
                          <selectedQuestion.icon className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white">{selectedQuestion.title}</h3>
                      </div>
                      
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-sm font-semibold text-financial-primary mb-3">Step-by-step guide:</h4>
                          <ol className="space-y-3">
                            {selectedQuestion.content.steps.map((step, index) => (
                              <li key={index} className="flex items-start space-x-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-financial-primary to-financial-success flex items-center justify-center text-xs font-bold text-white">
                                  {index + 1}
                                </span>
                                <span className="text-sm text-white/80">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                        
                        <div className="p-4 rounded-lg bg-white/5 border border-financial-border">
                          <h4 className="text-sm font-semibold text-financial-success mb-2">💡 Pro Tip:</h4>
                          <p className="text-sm text-white/80">{selectedQuestion.content.visual}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};
