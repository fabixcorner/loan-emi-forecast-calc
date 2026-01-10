import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { IndianRupee, Percent, Calendar, CreditCard, TrendingUp, Target, Building, Briefcase, Star, FileDown } from "lucide-react";
import { exportAffordabilityPDF } from "@/utils/exportUtils";

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

type EmploymentType = "salaried" | "self-employed" | "business-owner";

const employmentMultipliers: Record<EmploymentType, number> = {
  "salaried": 1.0,
  "self-employed": 0.85,
  "business-owner": 0.9,
};

const getCreditScoreMultiplier = (score: number): number => {
  if (score >= 800) return 1.1;
  if (score >= 750) return 1.0;
  if (score >= 700) return 0.9;
  if (score >= 650) return 0.8;
  return 0.7;
};

const getCreditScoreRating = (score: number): { label: string; color: string } => {
  if (score >= 800) return { label: "Excellent", color: "text-green-500" };
  if (score >= 750) return { label: "Good", color: "text-emerald-500" };
  if (score >= 700) return { label: "Fair", color: "text-yellow-500" };
  if (score >= 650) return { label: "Poor", color: "text-orange-500" };
  return { label: "Very Poor", color: "text-red-500" };
};

export const LoanAffordabilityCalculator = () => {
  const [grossIncome, setGrossIncome] = useState(100000);
  const [tenure, setTenure] = useState(20);
  const [interestRate, setInterestRate] = useState(8.5);
  const [otherEMIs, setOtherEMIs] = useState(0);
  const [hasCreditScore, setHasCreditScore] = useState(false);
  const [creditScore, setCreditScore] = useState(750);
  const [employmentType, setEmploymentType] = useState<EmploymentType>("salaried");
  const [propertyValue, setPropertyValue] = useState(5000000);
  const [eligibleAmount, setEligibleAmount] = useState(0);
  const [maxEMI, setMaxEMI] = useState(0);
  const [ltvLimit, setLtvLimit] = useState(0);

  useEffect(() => {
    // Banks typically allow 40-50% of gross income for all EMIs
    const baseFOIR = 0.5;
    const maxAllowedEMI = grossIncome * baseFOIR;
    const availableForNewEMI = Math.max(0, maxAllowedEMI - otherEMIs);
    setMaxEMI(availableForNewEMI);

    // Calculate base eligible loan amount using EMI formula reversed
    const monthlyRate = interestRate / 100 / 12;
    const months = tenure * 12;

    let baseLoanAmount = 0;
    if (monthlyRate > 0 && months > 0 && availableForNewEMI > 0) {
      const factor = Math.pow(1 + monthlyRate, months);
      baseLoanAmount = availableForNewEMI * (factor - 1) / (monthlyRate * factor);
    }

    // Apply credit score multiplier (only if credit score is known)
    const creditMultiplier = hasCreditScore ? getCreditScoreMultiplier(creditScore) : 1.0;

    // Apply employment type multiplier
    const employmentMultiplier = employmentMultipliers[employmentType];

    // Calculate income-based eligibility
    const incomeBasedEligibility = baseLoanAmount * creditMultiplier * employmentMultiplier;

    // Calculate LTV-based limit (typically 75-90% of property value)
    const ltvRatio = hasCreditScore && creditScore >= 750 ? 0.85 : 0.75;
    const ltvBasedLimit = propertyValue * ltvRatio;
    setLtvLimit(ltvBasedLimit);

    // Final eligibility is minimum of income-based and LTV-based
    const finalEligibility = Math.min(incomeBasedEligibility, ltvBasedLimit);
    setEligibleAmount(Math.round(Math.max(0, finalEligibility)));
  }, [grossIncome, tenure, interestRate, otherEMIs, hasCreditScore, creditScore, employmentType, propertyValue]);

  const creditRating = getCreditScoreRating(creditScore);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Section - Inputs */}
        <Card className="h-fit bg-card shadow-card border border-border">
          <CardHeader className="bg-gradient-to-r from-financial-primary to-financial-success text-primary-foreground rounded-t-lg py-3">
            <CardTitle className="text-xl font-semibold">Affordability Inputs</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-5">
            {/* Gross Income */}
            <div className="space-y-2.5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 pt-2 w-36">
                  <Label className="text-sm font-medium text-foreground">
                    Gross Income (Monthly)
                  </Label>
                </div>
                <div className="w-4/5 space-y-2.5">
                  <Input
                    type="number"
                    value={grossIncome}
                    onChange={(e) => setGrossIncome(Math.max(0, Number(e.target.value)))}
                    className="h-10"
                  />
                  <Slider
                    value={[grossIncome]}
                    onValueChange={(value) => setGrossIncome(value[0])}
                    min={10000}
                    max={1000000}
                    step={5000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>₹10K</span>
                    <span>₹10L</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Employment Type */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-36">
                  <Label className="text-sm font-medium text-foreground">
                    Employment Type
                  </Label>
                </div>
                <div className="w-4/5">
                  <Select value={employmentType} onValueChange={(value: EmploymentType) => setEmploymentType(value)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salaried">Salaried Employee</SelectItem>
                      <SelectItem value="self-employed">Self-Employed Professional</SelectItem>
                      <SelectItem value="business-owner">Business Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Tenure */}
            <div className="space-y-2.5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 pt-2 w-36">
                  <Label className="text-sm font-medium text-foreground">
                    Loan Tenure (Years)
                  </Label>
                </div>
                <div className="w-4/5 space-y-2.5">
                  <Input
                    type="number"
                    value={tenure}
                    onChange={(e) => setTenure(Math.min(30, Math.max(1, Number(e.target.value))))}
                    className="h-10"
                  />
                  <Slider
                    value={[tenure]}
                    onValueChange={(value) => setTenure(value[0])}
                    min={1}
                    max={30}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 year</span>
                    <span>30 years</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Interest Rate */}
            <div className="space-y-2.5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 pt-2 w-36">
                  <Label className="text-sm font-medium text-foreground">
                    Interest Rate (% p.a.)
                  </Label>
                </div>
                <div className="w-4/5 space-y-2.5">
                  <Input
                    type="number"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Math.min(20, Math.max(1, Number(e.target.value))))}
                    step="0.1"
                    className="h-10"
                  />
                  <Slider
                    value={[interestRate]}
                    onValueChange={(value) => setInterestRate(value[0])}
                    min={5}
                    max={20}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5%</span>
                    <span>20%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Other EMIs */}
            <div className="space-y-2.5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 pt-2 w-36">
                  <Label className="text-sm font-medium text-foreground">
                    Other EMIs (Monthly)
                  </Label>
                </div>
                <div className="w-4/5 space-y-2.5">
                  <Input
                    type="number"
                    value={otherEMIs}
                    onChange={(e) => setOtherEMIs(Math.max(0, Number(e.target.value)))}
                    className="h-10"
                  />
                  <Slider
                    value={[otherEMIs]}
                    onValueChange={(value) => setOtherEMIs(value[0])}
                    min={0}
                    max={grossIncome * 0.5}
                    step={1000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>₹0</span>
                    <span>{formatCurrency(grossIncome * 0.5)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Property Value */}
            <div className="space-y-2.5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 pt-2 w-36">
                  <Label className="text-sm font-medium text-foreground">
                    Property Value
                  </Label>
                </div>
                <div className="w-4/5 space-y-2.5">
                  <Input
                    type="number"
                    value={propertyValue}
                    onChange={(e) => setPropertyValue(Math.max(0, Number(e.target.value)))}
                    className="h-10"
                  />
                  <Slider
                    value={[propertyValue]}
                    onValueChange={(value) => setPropertyValue(value[0])}
                    min={500000}
                    max={50000000}
                    step={100000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>₹5L</span>
                    <span>₹5Cr</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Credit Score Toggle and Input */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-36">
                  <Label className="text-sm font-medium text-foreground">
                    Know Credit Score?
                  </Label>
                </div>
                <div className="w-4/5">
                  <Switch
                    checked={hasCreditScore}
                    onCheckedChange={setHasCreditScore}
                  />
                </div>
              </div>
              
              {hasCreditScore && (
                <div className="flex items-start gap-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex-shrink-0 pt-2 w-36">
                    <Label className="text-sm font-medium text-foreground">
                      Credit Score
                    </Label>
                  </div>
                  <div className="w-4/5 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={creditScore}
                        onChange={(e) => setCreditScore(Math.min(900, Math.max(300, Number(e.target.value))))}
                        className="h-10 flex-1"
                      />
                      <span className={`text-sm font-medium ${creditRating.color} whitespace-nowrap`}>
                        {creditRating.label}
                      </span>
                    </div>
                    <Slider
                      value={[creditScore]}
                      onValueChange={(value) => setCreditScore(value[0])}
                      min={300}
                      max={900}
                      step={10}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>300</span>
                      <span>900</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Section - Results */}
        <Card className="h-fit bg-card shadow-card border border-border">
          <CardHeader className="bg-gradient-to-r from-financial-primary to-financial-success text-primary-foreground rounded-t-lg py-3">
            <CardTitle className="text-xl font-semibold">Loan Eligibility</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Eligible Loan Amount - Main Result */}
            <div className="bg-gradient-to-br from-financial-success/20 to-financial-primary/20 rounded-xl p-6 border border-financial-success/30">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground uppercase tracking-wider">You are eligible for</p>
                <p className="text-4xl font-bold text-financial-success">{formatCurrency(eligibleAmount)}</p>
                <p className="text-sm text-muted-foreground">based on your income, profile, and property value</p>
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
              <div className="bg-background/50 rounded-lg p-4 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">LTV Limit</p>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(ltvLimit)}</p>
                <p className="text-xs text-muted-foreground">({hasCreditScore && creditScore >= 750 ? "85%" : "75%"} of property)</p>
              </div>
              <div className="bg-background/50 rounded-lg p-4 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Employment Factor</p>
                <p className="text-lg font-semibold text-foreground">{(employmentMultipliers[employmentType] * 100).toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground capitalize">({employmentType.replace("-", " ")})</p>
              </div>
            </div>

            {/* Assumptions */}
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Calculation Assumptions</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Banks allow up to 50% of gross income for EMIs (FOIR)</li>
                <li>• LTV ratio: {hasCreditScore && creditScore >= 750 ? "85%" : "75%"} based on {hasCreditScore ? "credit score" : "default assumption"}</li>
                <li>• Employment type affects eligibility ({employmentType === "salaried" ? "100%" : employmentType === "business-owner" ? "90%" : "85%"} factor)</li>
                {hasCreditScore && <li>• Credit score ({creditScore}) applies {(getCreditScoreMultiplier(creditScore) * 100).toFixed(0)}% multiplier</li>}
                <li>• Does not include processing fees or insurance</li>
              </ul>
            </div>

            {/* Export Button */}
            <Button
              onClick={() => exportAffordabilityPDF({
                grossIncome,
                tenure,
                interestRate,
                otherEMIs,
                hasCreditScore,
                creditScore,
                employmentType,
                propertyValue,
                eligibleAmount,
                maxEMI,
                ltvLimit,
              })}
              className="w-full gap-2 bg-financial-success hover:bg-financial-success/90"
            >
              <FileDown className="w-4 h-4" />
              Export as PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
