import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GitCompare, TrendingDown, Clock, IndianRupee, Percent } from "lucide-react";
import { calculateLoanEMI } from "@/utils/loanCalculations";
import { PartPayment } from "./PartPaymentSection";

interface LoanScenario {
  id: string;
  name: string;
  loanAmount: number;
  interestRate: number;
  loanTenure: number;
  partPayments: PartPayment[];
}

interface ScenarioResult {
  emi: number;
  totalInterest: number;
  totalAmount: number;
  tenureMonths: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatAmount = (value: number): string => {
  if (value >= 10000000) {
    return `${(value / 10000000).toFixed(2)} Cr`;
  } else if (value >= 100000) {
    return `${(value / 100000).toFixed(2)} L`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} K`;
  }
  return value.toString();
};

interface LoanComparisonSectionProps {
  baseAmount: number;
  baseRate: number;
  baseTenure: number;
  basePartPayments: PartPayment[];
  startMonth: number;
  startYear: number;
}

export const LoanComparisonSection = ({
  baseAmount,
  baseRate,
  baseTenure,
  basePartPayments,
  startMonth,
  startYear,
}: LoanComparisonSectionProps) => {
  const [scenarios, setScenarios] = useState<LoanScenario[]>([
    {
      id: "base",
      name: "Current",
      loanAmount: baseAmount,
      interestRate: baseRate,
      loanTenure: baseTenure,
      partPayments: basePartPayments,
    },
    {
      id: "scenario-1",
      name: "Scenario 1",
      loanAmount: baseAmount,
      interestRate: baseRate - 0.5,
      loanTenure: baseTenure,
      partPayments: [],
    },
  ]);

  const [results, setResults] = useState<Record<string, ScenarioResult>>({});

  // Update base scenario when props change
  useEffect(() => {
    setScenarios(prev => prev.map(s => 
      s.id === "base" 
        ? { ...s, loanAmount: baseAmount, interestRate: baseRate, loanTenure: baseTenure, partPayments: basePartPayments }
        : s
    ));
  }, [baseAmount, baseRate, baseTenure, basePartPayments]);

  // Calculate results for all scenarios
  useEffect(() => {
    const newResults: Record<string, ScenarioResult> = {};
    scenarios.forEach(scenario => {
      const calc = calculateLoanEMI(
        scenario.loanAmount,
        scenario.interestRate,
        scenario.loanTenure,
        startMonth,
        startYear,
        scenario.partPayments
      );
      newResults[scenario.id] = {
        emi: calc.emi,
        totalInterest: calc.totalInterest,
        totalAmount: calc.totalAmount,
        tenureMonths: calc.schedule.length,
      };
    });
    setResults(newResults);
  }, [scenarios, startMonth, startYear]);

  const addScenario = () => {
    if (scenarios.length >= 4) return;
    const newId = `scenario-${Date.now()}`;
    setScenarios(prev => [...prev, {
      id: newId,
      name: `Scenario ${prev.length}`,
      loanAmount: baseAmount,
      interestRate: baseRate,
      loanTenure: baseTenure,
      partPayments: [],
    }]);
  };

  const removeScenario = (id: string) => {
    if (id === "base") return;
    setScenarios(prev => prev.filter(s => s.id !== id));
  };

  const updateScenario = (id: string, updates: Partial<LoanScenario>) => {
    setScenarios(prev => prev.map(s => 
      s.id === id ? { ...s, ...updates } : s
    ));
  };

  const addPartPaymentToScenario = (scenarioId: string) => {
    const newPayment: PartPayment = {
      id: `pp-${Date.now()}`,
      month: startMonth,
      year: startYear + 1,
      amount: 100000,
      frequency: 'one-time',
      strategy: 'reduce-tenure',
    };
    setScenarios(prev => prev.map(s => 
      s.id === scenarioId 
        ? { ...s, partPayments: [...s.partPayments, newPayment] }
        : s
    ));
  };

  const removePartPaymentFromScenario = (scenarioId: string, paymentId: string) => {
    setScenarios(prev => prev.map(s => 
      s.id === scenarioId 
        ? { ...s, partPayments: s.partPayments.filter(p => p.id !== paymentId) }
        : s
    ));
  };

  // Find best scenario for each metric
  const getBestForMetric = (metric: keyof ScenarioResult, lowest = true) => {
    let best = scenarios[0]?.id;
    let bestValue = results[scenarios[0]?.id]?.[metric] || 0;
    scenarios.forEach(s => {
      const value = results[s.id]?.[metric] || 0;
      if (lowest ? value < bestValue : value > bestValue) {
        best = s.id;
        bestValue = value;
      }
    });
    return best;
  };

  const bestEMI = getBestForMetric('emi');
  const bestInterest = getBestForMetric('totalInterest');
  const bestTenure = getBestForMetric('tenureMonths');

  return (
    <Card className="glass-card border-financial-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-white" />
            Loan Comparison
          </CardTitle>
          {scenarios.length < 4 && (
            <Button 
              onClick={addScenario} 
              size="sm"
              variant="outline"
              className="border-financial-success/50 text-financial-success hover:bg-financial-success/20"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Scenario
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`grid gap-4 ${scenarios.length === 2 ? 'grid-cols-1 md:grid-cols-2' : scenarios.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
          {scenarios.map((scenario, index) => (
            <div 
              key={scenario.id} 
              className={`p-4 rounded-lg border ${
                scenario.id === 'base' 
                  ? 'bg-financial-primary/10 border-financial-primary/30' 
                  : 'bg-muted/10 border-muted/30'
              }`}
            >
              {/* Scenario Header */}
              <div className="flex items-center justify-between mb-4">
                <Input
                  value={scenario.name}
                  onChange={(e) => updateScenario(scenario.id, { name: e.target.value })}
                  className="text-sm font-medium bg-transparent border-none p-0 h-auto text-white focus-visible:ring-0"
                  disabled={scenario.id === 'base'}
                />
                {scenario.id !== 'base' && (
                  <Button
                    onClick={() => removeScenario(scenario.id)}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive hover:bg-destructive/20"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {/* Loan Parameters */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <IndianRupee className="w-3 h-3" /> Loan Amount
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      value={scenario.loanAmount}
                      onChange={(e) => updateScenario(scenario.id, { loanAmount: Number(e.target.value) })}
                      className="text-sm h-8"
                      disabled={scenario.id === 'base'}
                    />
                  </div>
                  {scenario.id !== 'base' && (
                    <Slider
                      value={[scenario.loanAmount]}
                      onValueChange={(v) => updateScenario(scenario.id, { loanAmount: v[0] })}
                      min={100000}
                      max={50000000}
                      step={100000}
                      className="mt-2"
                    />
                  )}
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Percent className="w-3 h-3" /> Interest Rate (%)
                  </Label>
                  <Input
                    type="number"
                    value={scenario.interestRate}
                    onChange={(e) => updateScenario(scenario.id, { interestRate: Number(e.target.value) })}
                    step={0.1}
                    className="text-sm h-8 mt-1"
                    disabled={scenario.id === 'base'}
                  />
                  {scenario.id !== 'base' && (
                    <Slider
                      value={[scenario.interestRate]}
                      onValueChange={(v) => updateScenario(scenario.id, { interestRate: v[0] })}
                      min={5}
                      max={20}
                      step={0.1}
                      className="mt-2"
                    />
                  )}
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Tenure (Years)
                  </Label>
                  <Input
                    type="number"
                    value={scenario.loanTenure}
                    onChange={(e) => updateScenario(scenario.id, { loanTenure: Number(e.target.value) })}
                    className="text-sm h-8 mt-1"
                    disabled={scenario.id === 'base'}
                  />
                  {scenario.id !== 'base' && (
                    <Slider
                      value={[scenario.loanTenure]}
                      onValueChange={(v) => updateScenario(scenario.id, { loanTenure: v[0] })}
                      min={1}
                      max={30}
                      step={1}
                      className="mt-2"
                    />
                  )}
                </div>

                {/* Part Payments */}
                {scenario.id !== 'base' && (
                  <div className="pt-2 border-t border-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs text-muted-foreground">Part Payments</Label>
                      <Button
                        onClick={() => addPartPaymentToScenario(scenario.id)}
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-financial-success hover:bg-financial-success/20"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    </div>
                    {scenario.partPayments.length > 0 ? (
                      <div className="space-y-2">
                        {scenario.partPayments.map(pp => (
                          <div key={pp.id} className="flex items-center justify-between text-xs bg-muted/20 rounded px-2 py-1">
                            <span className="text-white">{formatAmount(pp.amount)}</span>
                            <div className="flex items-center gap-1">
                              <Select
                                value={pp.strategy}
                                onValueChange={(v: 'reduce-tenure' | 'reduce-emi') => {
                                  setScenarios(prev => prev.map(s => 
                                    s.id === scenario.id 
                                      ? { ...s, partPayments: s.partPayments.map(p => p.id === pp.id ? { ...p, strategy: v } : p) }
                                      : s
                                  ));
                                }}
                              >
                                <SelectTrigger className="h-6 text-xs w-[90px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="reduce-tenure">Tenure</SelectItem>
                                  <SelectItem value="reduce-emi">EMI</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={() => removePartPaymentFromScenario(scenario.id, pp.id)}
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0 text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No part payments</p>
                    )}
                  </div>
                )}
              </div>

              {/* Results */}
              {results[scenario.id] && (
                <div className="mt-4 pt-4 border-t border-muted/30 space-y-2">
                  <div className={`flex justify-between items-center text-sm ${bestEMI === scenario.id ? 'text-financial-success font-medium' : 'text-white'}`}>
                    <span>EMI</span>
                    <span>{formatCurrency(results[scenario.id].emi)}</span>
                  </div>
                  <div className={`flex justify-between items-center text-sm ${bestInterest === scenario.id ? 'text-financial-success font-medium' : 'text-white'}`}>
                    <span>Total Interest</span>
                    <span>{formatCurrency(results[scenario.id].totalInterest)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-white">
                    <span>Total Amount</span>
                    <span>{formatCurrency(results[scenario.id].totalAmount)}</span>
                  </div>
                  <div className={`flex justify-between items-center text-sm ${bestTenure === scenario.id ? 'text-financial-success font-medium' : 'text-white'}`}>
                    <span>Tenure</span>
                    <span>{Math.floor(results[scenario.id].tenureMonths / 12)}y {results[scenario.id].tenureMonths % 12}m</span>
                  </div>
                </div>
              )}

              {/* Savings vs Base */}
              {scenario.id !== 'base' && results['base'] && results[scenario.id] && (
                <div className="mt-3 pt-3 border-t border-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">vs Current:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`text-xs ${results[scenario.id].totalInterest < results['base'].totalInterest ? 'text-financial-success' : 'text-destructive'}`}>
                      <TrendingDown className="w-3 h-3 inline mr-1" />
                      {formatAmount(Math.abs(results['base'].totalInterest - results[scenario.id].totalInterest))}
                      {results[scenario.id].totalInterest < results['base'].totalInterest ? ' saved' : ' more'}
                    </div>
                    <div className={`text-xs ${results[scenario.id].tenureMonths < results['base'].tenureMonths ? 'text-financial-success' : 'text-destructive'}`}>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {Math.abs(results['base'].tenureMonths - results[scenario.id].tenureMonths)}m
                      {results[scenario.id].tenureMonths < results['base'].tenureMonths ? ' less' : ' more'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
