import { useState } from "react";
import { HelpCircle, X, Calendar, TrendingDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
    id: "part-payments",
    title: "How to benefit by making part payments during a loan tenure?",
    icon: TrendingDown,
    content: {
      steps: [
        "Scroll to the 'Part Payment' section in the Loan Summary area",
        "Click 'Add Part Payment' to schedule an additional payment",
        "Choose the month/year and amount for your part payment",
        "Select frequency: one-time, monthly, quarterly, half-yearly, or yearly",
        "Watch your interest savings and time savings appear in real-time!",
        "The updated schedule shows how part payments reduce your loan tenure and total interest",
      ],
      visual: "Part payments directly reduce your principal, leading to substantial interest savings. The calculator shows you exactly how much time and money you'll save with each part payment.",
    },
  },
];

export const HowItWorks = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  const handleQuestionClick = (question: Question) => {
    setSelectedQuestion(question);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-white hover:bg-white/10"
      >
        <HelpCircle className="mr-2 h-4 w-4" />
        How it works?
      </Button>

      {isOpen && (
        <>
          {/* Backdrop blur - covers entire page and prevents interaction */}
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] animate-in fade-in"
            onClick={() => setIsOpen(false)}
            style={{ pointerEvents: 'all' }}
          />
          
          {/* Questions overlay - positioned below header */}
          <div className="fixed left-0 right-0 top-24 z-[10000] flex justify-center px-4 pb-4 overflow-y-auto max-h-[calc(100vh-6rem)]" style={{ pointerEvents: 'none' }}>
            <div className="glass-card p-6 space-y-4 max-w-2xl w-full animate-in slide-in-from-top fade-in duration-300" style={{ pointerEvents: 'all' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white">How it works?</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="grid gap-4">
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
          </div>
        </>
      )}

      {/* Question detail dialog */}
      <Dialog open={!!selectedQuestion} onOpenChange={() => setSelectedQuestion(null)}>
        <DialogContent className="max-w-2xl glass-card border-financial-border">
          {selectedQuestion && (
            <>
              <DialogHeader>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-financial-primary to-financial-success">
                    <selectedQuestion.icon className="h-6 w-6 text-white" />
                  </div>
                  <DialogTitle className="text-white">{selectedQuestion.title}</DialogTitle>
                </div>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
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
        </DialogContent>
      </Dialog>
    </>
  );
};
