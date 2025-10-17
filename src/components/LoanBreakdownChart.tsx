import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

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

interface LoanBreakdownChartProps {
  calculation: LoanCalculation | null;
  showSchedule: boolean;
}

export const LoanBreakdownChart = ({ calculation, showSchedule }: LoanBreakdownChartProps) => {
  if (!calculation) {
    return null;
  }

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
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Loan Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
              <Legend 
                formatter={(value, entry) => (
                  <span style={{ color: entry.color }}>
                    {value}: {formatCurrency(entry.payload.value)}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
