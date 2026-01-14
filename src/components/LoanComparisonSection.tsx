import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Plus, Trash2, TrendingDown, Clock, IndianRupee, Percent, Award, Trophy, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { calculateLoanEMI } from "@/utils/loanCalculations";
import { PartPayment } from "./PartPaymentSection";

interface LoanScenario {
  id: string;
  name: string;
  loanAmount: number;
  interestRate: number;
  loanTenure: number;
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
  const STORAGE_KEY = 'loan-comparison-scenarios';

  const [scenarios, setScenarios] = useState<LoanScenario[]>(() => {
    // Load saved scenarios from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as LoanScenario[];
        // Always include base scenario with current values, then add saved non-base scenarios
        const nonBaseScenarios = parsed.filter(s => s.id !== 'base');
        return [
          {
            id: "base",
            name: "Current",
            loanAmount: baseAmount,
            interestRate: baseRate,
            loanTenure: baseTenure,
          },
          ...nonBaseScenarios,
        ];
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error('Error parsing saved scenarios:', e);
        }
      }
    }
    // Default scenarios if nothing saved
    return [
      {
        id: "base",
        name: "Current",
        loanAmount: baseAmount,
        interestRate: baseRate,
        loanTenure: baseTenure,
      },
      {
        id: "scenario-1",
        name: "Scenario 1",
        loanAmount: baseAmount,
        interestRate: baseRate - 0.5,
        loanTenure: baseTenure,
      },
    ];
  });

  // Save non-base scenarios to localStorage whenever they change
  useEffect(() => {
    const nonBaseScenarios = scenarios.filter(s => s.id !== 'base');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nonBaseScenarios));
  }, [scenarios]);

  const [results, setResults] = useState<Record<string, ScenarioResult>>({});

  // Update base scenario when props change
  useEffect(() => {
    setScenarios(prev => prev.map(s => 
      s.id === "base" 
        ? { ...s, loanAmount: baseAmount, interestRate: baseRate, loanTenure: baseTenure }
        : s
    ));
  }, [baseAmount, baseRate, baseTenure, basePartPayments]);

  // Calculate results for all scenarios - no part payments for fair comparison
  useEffect(() => {
    const newResults: Record<string, ScenarioResult> = {};
    scenarios.forEach(scenario => {
      const calc = calculateLoanEMI(
        scenario.loanAmount,
        scenario.interestRate,
        scenario.loanTenure,
        startMonth,
        startYear,
        [] // No part payments for any scenario in comparison
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

  // Calculate weighted scores for overall winner
  // Weights: EMI (30%), Interest (50%), Tenure (20%)
  const calculateWeightedScore = () => {
    if (scenarios.length <= 1 || Object.keys(results).length === 0) return null;

    // Find min/max for normalization
    const allResults = scenarios.map(s => results[s.id]).filter(Boolean);
    if (allResults.length === 0) return null;

    const minEMI = Math.min(...allResults.map(r => r.emi));
    const maxEMI = Math.max(...allResults.map(r => r.emi));
    const minInterest = Math.min(...allResults.map(r => r.totalInterest));
    const maxInterest = Math.max(...allResults.map(r => r.totalInterest));
    const minTenure = Math.min(...allResults.map(r => r.tenureMonths));
    const maxTenure = Math.max(...allResults.map(r => r.tenureMonths));

    const scores: Record<string, { score: number; breakdown: { emi: number; interest: number; tenure: number } }> = {};

    scenarios.forEach(scenario => {
      const result = results[scenario.id];
      if (!result) return;

      // Normalize scores (0-100, lower is better for all metrics)
      const emiScore = maxEMI === minEMI ? 100 : 100 - ((result.emi - minEMI) / (maxEMI - minEMI)) * 100;
      const interestScore = maxInterest === minInterest ? 100 : 100 - ((result.totalInterest - minInterest) / (maxInterest - minInterest)) * 100;
      const tenureScore = maxTenure === minTenure ? 100 : 100 - ((result.tenureMonths - minTenure) / (maxTenure - minTenure)) * 100;

      // Weighted score
      const weightedScore = (emiScore * 0.3) + (interestScore * 0.5) + (tenureScore * 0.2);

      scores[scenario.id] = {
        score: weightedScore,
        breakdown: { emi: emiScore, interest: interestScore, tenure: tenureScore }
      };
    });

    // Find overall winner
    let winnerId = scenarios[0]?.id;
    let highestScore = scores[scenarios[0]?.id]?.score || 0;
    
    Object.entries(scores).forEach(([id, data]) => {
      if (data.score > highestScore) {
        winnerId = id;
        highestScore = data.score;
      }
    });

    return { scores, winnerId, highestScore };
  };

  const weightedResults = calculateWeightedScore();

  return (
    <Card className="bg-card shadow-card border border-border">
      <CardHeader className="bg-gradient-to-r from-financial-success to-financial-primary text-primary-foreground rounded-t-lg py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Loan Comparison</CardTitle>
          {scenarios.length < 3 && (
            <Button 
              onClick={addScenario} 
              size="sm"
              variant="outline"
              className="gap-2 bg-primary-foreground/20 border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/30 hover:text-primary-foreground"
            >
              <Plus className="w-4 h-4" />
              Add Scenario
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground mb-3 italic">
          Note: Part payments are excluded from all scenarios for fair comparison.
        </p>
        <div className={`grid gap-3 ${scenarios.length === 2 ? 'grid-cols-1 md:grid-cols-2' : scenarios.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
          {scenarios.map((scenario, index) => (
            <div 
              key={scenario.id} 
              className={`p-3 rounded-lg border ${
                scenario.id === 'base' 
                  ? 'bg-financial-primary/10 border-financial-primary/30' 
                  : 'bg-muted/10 border-muted/30'
              }`}
            >
              {/* Scenario Header */}
              <div className="flex items-center justify-between mb-2">
                <Input
                  value={scenario.name}
                  onChange={(e) => updateScenario(scenario.id, { name: e.target.value })}
                  className="text-sm font-medium bg-transparent border-none p-0 h-auto text-foreground focus-visible:ring-0"
                  disabled={scenario.id === 'base'}
                />
                {scenario.id !== 'base' && (
                  <Button
                    onClick={() => removeScenario(scenario.id)}
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 text-destructive hover:bg-destructive/20"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {/* Best Scenario Badges */}
              {scenarios.length > 1 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {bestEMI === scenario.id && (
                    <Badge className="text-[10px] px-1.5 py-0 h-5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">
                      <Zap className="w-3 h-3 mr-0.5" />
                      Best EMI
                    </Badge>
                  )}
                  {bestInterest === scenario.id && (
                    <Badge className="text-[10px] px-1.5 py-0 h-5 bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/30">
                      <Trophy className="w-3 h-3 mr-0.5" />
                      Lowest Interest
                    </Badge>
                  )}
                  {bestTenure === scenario.id && (
                    <Badge className="text-[10px] px-1.5 py-0 h-5 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/30">
                      <Award className="w-3 h-3 mr-0.5" />
                      Shortest Tenure
                    </Badge>
                  )}
                </div>
              )}

              {/* Loan Parameters */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1 w-16 shrink-0">
                    <IndianRupee className="w-3 h-3" /> Amount
                  </Label>
                  <Input
                    type="number"
                    value={scenario.loanAmount}
                    onChange={(e) => updateScenario(scenario.id, { loanAmount: Number(e.target.value) })}
                    className="text-xs h-7 flex-1"
                    disabled={scenario.id === 'base'}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1 w-16 shrink-0">
                    <Percent className="w-3 h-3" /> Rate
                  </Label>
                  <Input
                    type="number"
                    value={scenario.interestRate}
                    onChange={(e) => updateScenario(scenario.id, { interestRate: Number(e.target.value) })}
                    step={0.1}
                    className="text-xs h-7 flex-1"
                    disabled={scenario.id === 'base'}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1 w-16 shrink-0">
                    <Clock className="w-3 h-3" /> Tenure
                  </Label>
                  <Input
                    type="number"
                    value={scenario.loanTenure}
                    onChange={(e) => updateScenario(scenario.id, { loanTenure: Number(e.target.value) })}
                    className="text-xs h-7 flex-1"
                    disabled={scenario.id === 'base'}
                  />
                </div>
              </div>

              {/* Results */}
              {results[scenario.id] && (
                <div className="mt-2 pt-2 border-t border-muted/30 space-y-1">
                  <div className={`flex justify-between items-center text-xs ${bestEMI === scenario.id ? 'text-financial-success font-medium' : 'text-foreground'}`}>
                    <span className="text-muted-foreground">EMI</span>
                    <span>{formatCurrency(results[scenario.id].emi)}</span>
                  </div>
                  <div className={`flex justify-between items-center text-xs ${
                    bestInterest === scenario.id 
                      ? 'text-financial-success font-medium' 
                      : scenario.id !== 'base' && results['base'] && results[scenario.id].totalInterest > results['base'].totalInterest 
                        ? 'text-destructive font-medium' 
                        : 'text-foreground'
                  }`}>
                    <span className="text-muted-foreground">Interest</span>
                    <span>{formatCurrency(results[scenario.id].totalInterest)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-foreground">
                    <span className="text-muted-foreground">Total</span>
                    <span>{formatCurrency(results[scenario.id].totalAmount)}</span>
                  </div>
                  <div className={`flex justify-between items-center text-xs ${bestTenure === scenario.id ? 'text-financial-success font-medium' : 'text-foreground'}`}>
                    <span className="text-muted-foreground">Tenure</span>
                    <span>{Math.floor(results[scenario.id].tenureMonths / 12)}y {results[scenario.id].tenureMonths % 12}m</span>
                  </div>
                </div>
              )}

              {/* Savings vs Base */}
              {scenario.id !== 'base' && results['base'] && results[scenario.id] && (
                <div className="mt-2 pt-2 border-t border-muted/30">
                  <p className="text-xs text-muted-foreground mb-0.5">vs Current:</p>
                  <div className="grid grid-cols-2 gap-1">
                    <div className={`text-xs ${results[scenario.id].totalInterest < results['base'].totalInterest ? 'text-financial-success' : 'text-destructive'}`}>
                      <TrendingDown className="w-3 h-3 inline mr-0.5" />
                      {formatAmount(Math.abs(results['base'].totalInterest - results[scenario.id].totalInterest))}
                      {results[scenario.id].totalInterest < results['base'].totalInterest ? ' saved' : ' more'}
                    </div>
                    <div className={`text-xs ${results[scenario.id].tenureMonths < results['base'].tenureMonths ? 'text-financial-success' : 'text-destructive'}`}>
                      <Clock className="w-3 h-3 inline mr-0.5" />
                      {Math.abs(results['base'].tenureMonths - results[scenario.id].tenureMonths)}m
                      {results[scenario.id].tenureMonths < results['base'].tenureMonths ? ' less' : ' more'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Overall Winner Summary */}
        {weightedResults && scenarios.length > 1 && (
          <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-financial-success/10 to-financial-primary/10 border border-financial-success/30">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-financial-success/20">
                  <Trophy className="w-5 h-5 text-financial-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Overall Winner</p>
                  <p className="text-lg font-semibold text-foreground">
                    {scenarios.find(s => s.id === weightedResults.winnerId)?.name || 'Unknown'}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Score</p>
                  <p className="text-xl font-bold text-financial-success">{weightedResults.highestScore.toFixed(0)}</p>
                </div>
                <div className="hidden md:block w-px bg-border" />
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">EMI (30%)</p>
                    <p className="text-sm font-medium text-foreground">
                      {weightedResults.scores[weightedResults.winnerId]?.breakdown.emi.toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Interest (50%)</p>
                    <p className="text-sm font-medium text-foreground">
                      {weightedResults.scores[weightedResults.winnerId]?.breakdown.interest.toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Tenure (20%)</p>
                    <p className="text-sm font-medium text-foreground">
                      {weightedResults.scores[weightedResults.winnerId]?.breakdown.tenure.toFixed(0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-3 italic">
              Weighted scoring: EMI (30%) + Interest Savings (50%) + Tenure (20%). Higher score = better overall value.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
