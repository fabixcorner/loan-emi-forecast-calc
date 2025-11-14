import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Sparkles } from "lucide-react";

interface LoanCalculation {
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
}

interface LoanSummaryCardsProps {
  calculation: LoanCalculation | null;
  interestSavings?: number;
  timeSavings?: number;
  partPaymentStrategy?: 'reduce-tenure' | 'reduce-emi';
}

export const LoanSummaryCards = ({ calculation, interestSavings = 0, timeSavings = 0, partPaymentStrategy = 'reduce-tenure' }: LoanSummaryCardsProps) => {
  if (!calculation) {
    return null;
  }

  const hasPartPayments = interestSavings > 0;
  const isReduceEMI = partPaymentStrategy === 'reduce-emi';
  
  // Calculate average EMI for reduce-emi strategy
  const averageEMI = isReduceEMI && calculation.schedule.length > 0
    ? calculation.schedule.reduce((sum, row) => sum + row.emiAmount, 0) / calculation.schedule.length
    : calculation.emi;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate totals
  const totalPrincipal = calculation.totalAmount - calculation.totalInterest;
  const totalPartPayments = calculation.schedule.reduce((sum, row) => sum + row.partPayment, 0);
  
  const pieChartData = [
    { name: 'Principal', value: totalPrincipal, color: 'hsl(var(--financial-success))' },
    { name: 'Interest', value: calculation.totalInterest, color: 'hsl(var(--financial-warning))' },
    { name: 'Part Payments', value: totalPartPayments, color: 'hsl(var(--financial-primary))' }
  ].filter(item => item.value > 0);

  return (
    <div className={`grid gap-4 ${hasPartPayments ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'}`}>
      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="p-3">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1 font-bold">
              {isReduceEMI && hasPartPayments ? 'Avg. Monthly EMI' : 'Monthly EMI'}
            </p>
            <p className="text-2xl font-bold text-financial-primary">
              {formatCurrency(isReduceEMI && hasPartPayments ? averageEMI : calculation.emi)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="p-3">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1 font-bold">Total Interest</p>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(calculation.totalInterest)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="p-3">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1 font-bold">Total Amount</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(calculation.totalAmount)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Interest Saved Card - only show when part payments exist */}
      {hasPartPayments && (
        <>
          <Card className="shadow-[var(--shadow-card)] bg-gradient-to-br from-financial-success/10 to-financial-success/5 border-financial-success/30 relative overflow-hidden">
            <div className="absolute top-2 right-2 animate-pulse">
              <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1 font-bold">Interest Saved</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
                  {formatCurrency(interestSavings)}
                </p>
              </div>
            </CardContent>
          </Card>

          {timeSavings > 0 && (
            <Card className="shadow-[var(--shadow-card)] bg-gradient-to-br from-financial-primary/10 to-financial-primary/5 border-financial-primary/30 relative overflow-hidden">
              <div className="absolute top-2 right-2 animate-pulse">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <CardContent className="p-3">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1 font-bold">Time Saved</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
                    {timeSavings} {timeSavings === 1 ? 'month' : 'months'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};