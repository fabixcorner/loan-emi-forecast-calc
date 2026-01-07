import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { IndianRupee, Percent, Calendar, CreditCard, TrendingUp, Target } from "lucide-react";

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const LoanAffordabilityCalculator = () => {
  const [grossIncome, setGrossIncome] = useState(100000);
  const [tenure, setTenure] = useState(20);
  const [interestRate, setInterestRate] = useState(8.5);
  const [otherEMIs, setOtherEMIs] = useState(0);
  const [eligibleAmount, setEligibleAmount] = useState(0);
  const [maxEMI, setMaxEMI] = useState(0);

  useEffect(() => {
    // Banks typically allow 40-50% of gross income for all EMIs
    const maxAllowedEMI = grossIncome * 0.5;
    const availableForNewEMI = Math.max(0, maxAllowedEMI - otherEMIs);
    setMaxEMI(availableForNewEMI);

    // Calculate eligible loan amount using EMI formula reversed
    // EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
    // P = EMI * ((1 + r)^n - 1) / (r * (1 + r)^n)
    const monthlyRate = interestRate / 100 / 12;
    const months = tenure * 12;

    if (monthlyRate > 0 && months > 0 && availableForNewEMI > 0) {
      const factor = Math.pow(1 + monthlyRate, months);
      const loanAmount = availableForNewEMI * (factor - 1) / (monthlyRate * factor);
      setEligibleAmount(Math.round(loanAmount));
    } else {
      setEligibleAmount(0);
    }
  }, [grossIncome, tenure, interestRate, otherEMIs]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Section - Inputs */}
        <Card className="bg-card border-border shadow-card">
          <CardHeader className="bg-gradient-to-r from-financial-success to-financial-primary rounded-t-lg">
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="w-5 h-5" />
              Affordability Inputs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Gross Income */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-foreground flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-financial-primary" />
                  Gross Income (Monthly)
                </Label>
                <span className="text-sm font-medium text-foreground">{formatCurrency(grossIncome)}</span>
              </div>
              <Input
                type="number"
                value={grossIncome}
                onChange={(e) => setGrossIncome(Math.max(0, Number(e.target.value)))}
                className="bg-background border-border text-foreground"
              />
              <Slider
                value={[grossIncome]}
                onValueChange={(value) => setGrossIncome(value[0])}
                min={10000}
                max={1000000}
                step={5000}
                className="w-full"
              />
            </div>

            {/* Tenure */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-financial-primary" />
                  Loan Tenure (Years)
                </Label>
                <span className="text-sm font-medium text-foreground">{tenure} years</span>
              </div>
              <Input
                type="number"
                value={tenure}
                onChange={(e) => setTenure(Math.min(30, Math.max(1, Number(e.target.value))))}
                className="bg-background border-border text-foreground"
              />
              <Slider
                value={[tenure]}
                onValueChange={(value) => setTenure(value[0])}
                min={1}
                max={30}
                step={1}
                className="w-full"
              />
            </div>

            {/* Interest Rate */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-foreground flex items-center gap-2">
                  <Percent className="w-4 h-4 text-financial-primary" />
                  Interest Rate (% p.a.)
                </Label>
                <span className="text-sm font-medium text-foreground">{interestRate}%</span>
              </div>
              <Input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(Math.min(20, Math.max(1, Number(e.target.value))))}
                step="0.1"
                className="bg-background border-border text-foreground"
              />
              <Slider
                value={[interestRate]}
                onValueChange={(value) => setInterestRate(value[0])}
                min={5}
                max={20}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Other EMIs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-foreground flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-financial-primary" />
                  Other EMIs (Monthly)
                </Label>
                <span className="text-sm font-medium text-foreground">{formatCurrency(otherEMIs)}</span>
              </div>
              <Input
                type="number"
                value={otherEMIs}
                onChange={(e) => setOtherEMIs(Math.max(0, Number(e.target.value)))}
                className="bg-background border-border text-foreground"
              />
              <Slider
                value={[otherEMIs]}
                onValueChange={(value) => setOtherEMIs(value[0])}
                min={0}
                max={grossIncome * 0.5}
                step={1000}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Right Section - Results */}
        <Card className="bg-card border-border shadow-card">
          <CardHeader className="bg-gradient-to-r from-financial-success to-financial-primary rounded-t-lg">
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Loan Eligibility
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Eligible Loan Amount - Main Result */}
            <div className="bg-gradient-to-br from-financial-success/20 to-financial-primary/20 rounded-xl p-6 border border-financial-success/30">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground uppercase tracking-wider">You are eligible for</p>
                <p className="text-4xl font-bold text-financial-success">{formatCurrency(eligibleAmount)}</p>
                <p className="text-sm text-muted-foreground">based on your income and existing obligations</p>
              </div>
            </div>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background/50 rounded-lg p-4 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Max Allowed EMI</p>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(grossIncome * 0.5)}</p>
                <p className="text-xs text-muted-foreground">(50% of income)</p>
              </div>
              <div className="bg-background/50 rounded-lg p-4 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Available for New EMI</p>
                <p className="text-lg font-semibold text-financial-primary">{formatCurrency(maxEMI)}</p>
                <p className="text-xs text-muted-foreground">(after other EMIs)</p>
              </div>
            </div>

            {/* Assumptions */}
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Calculation Assumptions</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Banks allow up to 50% of gross income for EMIs (FOIR)</li>
                <li>• Actual eligibility may vary based on credit score</li>
                <li>• Does not include processing fees or insurance</li>
                <li>• Based on standard reducing balance method</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
