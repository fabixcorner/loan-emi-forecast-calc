import { useState } from "react";
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
    { name: 'Principal', value: totalPrincipal, color: 'hsl(142, 70%, 35%)' },
    { name: 'Interest', value: calculation.totalInterest, color: 'hsl(var(--destructive))' },
    { name: 'Part Payments', value: totalPartPayments, color: 'hsl(var(--financial-primary))' }
  ].filter(item => item.value > 0);

  const totalValue = pieChartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="bg-card shadow-card border border-border">
      <CardHeader className="bg-gradient-to-r from-financial-success to-financial-primary text-primary-foreground rounded-t-lg py-3">
        <CardTitle className="text-xl font-semibold">Loan Breakdown</CardTitle>
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
                onMouseEnter={(_, index) => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {pieChartData.map((entry, index) => {
                  const isHovered = hoveredIndex === index;
                  const isOtherHovered = hoveredIndex !== null && hoveredIndex !== index;
                  
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      style={{
                        filter: isOtherHovered ? 'blur(3px) brightness(0.7)' : isHovered ? 'brightness(1.3)' : 'none',
                        transition: 'all 0.3s ease',
                        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                        transformOrigin: 'center',
                        cursor: 'pointer'
                      }}
                    />
                  );
                })}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => {
                  const percentage = ((value / totalValue) * 100).toFixed(1);
                  return [`${percentage}%`, name];
                }}
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
