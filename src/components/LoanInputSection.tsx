import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface LoanInputSectionProps {
  loanAmount: number;
  setLoanAmount: (value: number) => void;
  interestRate: number;
  setInterestRate: (value: number) => void;
  loanTenure: number;
  setLoanTenure: (value: number) => void;
  startMonth: number;
  setStartMonth: (month: number) => void;
  startYear: number;
  setStartYear: (year: number) => void;
}

export const LoanInputSection = ({
  loanAmount,
  setLoanAmount,
  interestRate,
  setInterestRate,
  loanTenure,
  setLoanTenure,
  startMonth,
  setStartMonth,
  startYear,
  setStartYear,
}: LoanInputSectionProps) => {
  const formatAmount = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)} L`;
    } else {
      return `₹${(amount / 1000).toFixed(0)}K`;
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = 2001; year <= currentYear + 30; year++) {
      years.push(year);
    }
    return years;
  };

  return (
    <Card className="h-fit glass-card shadow-[var(--shadow-card)]">
      <CardHeader className="bg-gradient-to-r from-financial-primary to-financial-success text-white rounded-t-lg py-3">
        <CardTitle className="text-xl font-semibold">Loan Details</CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        {/* Loan Start Date */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-32">
              <Label className="text-sm font-medium text-foreground leading-tight">
                Start Month-Year
              </Label>
            </div>
            <div className="w-4/5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Month</Label>
                  <Select 
                    value={startMonth.toString()} 
                    onValueChange={(value) => setStartMonth(parseInt(value))}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {getMonthName(i + 1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Year</Label>
                  <Select 
                    value={startYear.toString()} 
                    onValueChange={(value) => setStartYear(parseInt(value))}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getYearOptions().map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loan Amount */}
        <div className="space-y-2.5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 pt-2 w-32">
              <Label htmlFor="loanAmount" className="text-sm font-medium text-foreground">
                Loan Amount
              </Label>
            </div>
            <div className="w-4/5 space-y-2.5">
              <Input
                id="loanAmount"
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="h-10"
                min={100000}
                max={30000000}
                step={100000}
              />
              <Slider
                value={[loanAmount]}
                onValueChange={(value) => setLoanAmount(value[0])}
                max={30000000}
                min={100000}
                step={100000}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>₹1L</span>
                <span>₹3Cr</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interest Rate */}
        <div className="space-y-2.5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 pt-2 w-32">
              <Label htmlFor="interestRate" className="text-sm font-medium text-foreground">
                Rate of Interest
              </Label>
            </div>
            <div className="w-4/5 space-y-2.5">
              <Input
                id="interestRate"
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="h-10"
                min={2}
                max={15}
                step={0.1}
              />
              <Slider
                value={[interestRate]}
                onValueChange={(value) => setInterestRate(value[0])}
                max={15}
                min={2}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>2%</span>
                <span>15%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Loan Tenure */}
        <div className="space-y-2.5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 pt-2 w-32">
              <Label htmlFor="loanTenure" className="text-sm font-medium text-foreground">
                Loan Tenure
              </Label>
            </div>
            <div className="w-4/5 space-y-2.5">
              <Input
                id="loanTenure"
                type="number"
                value={loanTenure}
                onChange={(e) => setLoanTenure(Number(e.target.value))}
                className="h-10"
                min={3}
                max={30}
                step={1}
              />
              <Slider
                value={[loanTenure]}
                onValueChange={(value) => setLoanTenure(value[0])}
                max={30}
                min={3}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>3 years</span>
                <span>30 years</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
