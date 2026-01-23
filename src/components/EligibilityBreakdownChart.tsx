import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, CreditCard, Briefcase, Home, CheckCircle } from "lucide-react";

interface EligibilityBreakdownChartProps {
  incomeBasedAmount: number;
  creditScoreMultiplier: number;
  employmentMultiplier: number;
  ltvLimit: number;
  finalEligibility: number;
  hasCreditScore: boolean;
}

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

const formatPercent = (value: number): string => {
  return `${(value * 100).toFixed(0)}%`;
};

export const EligibilityBreakdownChart = ({
  incomeBasedAmount,
  creditScoreMultiplier,
  employmentMultiplier,
  ltvLimit,
  finalEligibility,
  hasCreditScore,
}: EligibilityBreakdownChartProps) => {
  // Calculate intermediate values to show the waterfall effect
  const afterCreditScore = incomeBasedAmount * creditScoreMultiplier;
  const afterEmployment = afterCreditScore * employmentMultiplier;
  const incomeBasedFinal = afterEmployment;

  const chartData = [
    {
      name: "Income Based",
      value: incomeBasedAmount,
      description: "50% FOIR eligibility",
      color: "hsl(var(--financial-primary))",
      multiplier: null,
    },
    ...(hasCreditScore ? [{
      name: "Credit Score",
      value: afterCreditScore,
      description: `${formatPercent(creditScoreMultiplier)} multiplier`,
      color: creditScoreMultiplier >= 1 ? "hsl(var(--financial-success))" : "hsl(var(--destructive))",
      multiplier: creditScoreMultiplier,
    }] : []),
    {
      name: "Employment",
      value: afterEmployment,
      description: `${formatPercent(employmentMultiplier)} factor`,
      color: employmentMultiplier >= 1 ? "hsl(var(--financial-success))" : "hsl(221 83% 53%)",
      multiplier: employmentMultiplier,
    },
    {
      name: "LTV Limit",
      value: ltvLimit,
      description: "Property value cap",
      color: "hsl(var(--muted-foreground))",
      multiplier: null,
    },
    {
      name: "Final Eligible",
      value: finalEligibility,
      description: "Min of income & LTV",
      color: "hsl(var(--financial-success))",
      multiplier: null,
    },
  ];

  // Waterfall data for showing impact of each factor
  const impactData = [
    {
      factor: "Base (Income)",
      impact: incomeBasedAmount,
      fill: "hsl(var(--financial-primary))",
      isPositive: true,
      description: "Based on 50% FOIR",
    },
    ...(hasCreditScore ? [{
      factor: "Credit Score",
      impact: afterCreditScore - incomeBasedAmount,
      fill: creditScoreMultiplier >= 1 ? "hsl(var(--financial-success))" : "hsl(var(--destructive))",
      isPositive: creditScoreMultiplier >= 1,
      description: creditScoreMultiplier >= 1 ? `+${formatPercent(creditScoreMultiplier - 1)}` : formatPercent(creditScoreMultiplier - 1),
    }] : []),
    {
      factor: "Employment",
      impact: afterEmployment - afterCreditScore,
      fill: employmentMultiplier >= 1 ? "hsl(var(--financial-success))" : "hsl(221 83% 53%)",
      isPositive: employmentMultiplier >= 1,
      description: employmentMultiplier >= 1 ? `+${formatPercent(employmentMultiplier - 1)}` : formatPercent(employmentMultiplier - 1),
    },
    ...(ltvLimit < incomeBasedFinal ? [{
      factor: "LTV Cap",
      impact: ltvLimit - incomeBasedFinal,
      fill: "hsl(var(--destructive))",
      isPositive: false,
      description: "Capped by property",
    }] : []),
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{data.name || data.factor}</p>
          <p className="text-lg font-bold text-financial-primary">{formatCurrency(Math.abs(data.value || data.impact))}</p>
          <p className="text-xs text-muted-foreground">{data.description}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-card shadow-card border border-border">
      <CardHeader className="bg-gradient-to-r from-financial-primary to-financial-success text-primary-foreground rounded-t-lg py-3">
        <CardTitle className="text-lg font-semibold">Eligibility Factor Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {/* Horizontal Bar Chart showing each stage */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 80, left: 85, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
              <XAxis
                type="number"
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(value: number) => formatCurrency(value)}
                  style={{ fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 500 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Factor Impact Legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 text-xs bg-muted/40 rounded-md px-2.5 py-1.5 border border-border/50">
            <Wallet className="w-3.5 h-3.5 text-financial-primary" />
            <div className="w-2 h-2 rounded-sm bg-financial-primary" />
            <span className="text-muted-foreground">Income Based</span>
          </div>
          <div className="flex items-center gap-2 text-xs bg-muted/40 rounded-md px-2.5 py-1.5 border border-border/50">
            <CheckCircle className="w-3.5 h-3.5 text-financial-success" />
            <div className="w-2 h-2 rounded-sm bg-financial-success" />
            <span className="text-muted-foreground">Positive Impact</span>
          </div>
          <div className="flex items-center gap-2 text-xs bg-muted/40 rounded-md px-2.5 py-1.5 border border-border/50">
            <Briefcase className="w-3.5 h-3.5 text-[hsl(221,83%,53%)]" />
            <div className="w-2 h-2 rounded-sm bg-[hsl(221,83%,53%)]" />
            <span className="text-muted-foreground">Employment</span>
          </div>
          <div className="flex items-center gap-2 text-xs bg-muted/40 rounded-md px-2.5 py-1.5 border border-border/50">
            <Home className="w-3.5 h-3.5 text-muted-foreground" />
            <div className="w-2 h-2 rounded-sm bg-muted-foreground" />
            <span className="text-muted-foreground">LTV Cap</span>
          </div>
        </div>

        {/* Key Insights */}
        <div className="bg-muted/30 rounded-lg p-4 border border-border space-y-2">
          <p className="text-xs font-medium text-foreground uppercase tracking-wider">Key Insights</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            {ltvLimit < incomeBasedFinal && (
              <li className="flex items-start gap-1.5">
                <span className="text-destructive">•</span>
                <span>Your eligibility is limited by property LTV, not income capacity</span>
              </li>
            )}
            {ltvLimit >= incomeBasedFinal && (
              <li className="flex items-start gap-1.5">
                <span className="text-financial-success">•</span>
                <span>Your income supports the full loan amount within LTV limits</span>
              </li>
            )}
            {hasCreditScore && creditScoreMultiplier > 1 && (
              <li className="flex items-start gap-1.5">
                <span className="text-financial-success">•</span>
                <span>Good credit score boosts your eligibility by {formatPercent(creditScoreMultiplier - 1)}</span>
              </li>
            )}
            {hasCreditScore && creditScoreMultiplier < 1 && (
              <li className="flex items-start gap-1.5">
                <span className="text-destructive">•</span>
                <span>Improving credit score can increase eligibility by up to {formatPercent(1.1 - creditScoreMultiplier)}</span>
              </li>
            )}
            {employmentMultiplier < 1 && (
              <li className="flex items-start gap-1.5">
                <span className="text-muted-foreground">•</span>
                <span>Self-employed/business owners have {formatPercent(1 - employmentMultiplier)} lower eligibility than salaried</span>
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
