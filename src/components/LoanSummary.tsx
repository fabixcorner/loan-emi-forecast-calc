
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ComposedChart, Line } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Minus, BarChart3, CreditCard, Download, Share2, TrendingDown, GitCompare, ChevronLeft, ChevronRight, FileText, Keyboard } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { PartPaymentSection, PartPayment } from "@/components/PartPaymentSection";
import { LoanComparisonSection } from "@/components/LoanComparisonSection";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToExcel, exportToPDF, exportToJSON, exportToCSV, exportDetailedPDFReport } from "@/utils/exportUtils";

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
  chartData: {
    year: number;
    remainingBalance: number;
    principalPaid: number;
  }[];
}

interface LoanSummaryProps {
  calculation: LoanCalculation | null;
  partPayments: PartPayment[];
  setPartPayments: (payments: PartPayment[]) => void;
  startMonth: number;
  startYear: number;
  loanTenure: number;
  showSchedule: boolean;
  setShowSchedule: (show: boolean) => void;
  loanAmount: number;
  interestRate: number;
  baseAmount?: number;
  baseRate?: number;
  baseTenure?: number;
  hideActionButtons?: boolean;
}

export const LoanSummary = ({ 
  calculation, 
  partPayments, 
  setPartPayments, 
  startMonth, 
  startYear, 
  loanTenure,
  showSchedule,
  setShowSchedule,
  loanAmount,
  interestRate,
  baseAmount,
  baseRate,
  baseTenure,
  hideActionButtons = false
}: LoanSummaryProps) => {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [showPrepayments, setShowPrepayments] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [yearsPerPage, setYearsPerPage] = useState(5);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const scrollToTable = () => {
    tableContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Keyboard navigation for pagination - must be before any conditional returns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if schedule is shown
      if (!showSchedule) return;
      
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentPage(prev => {
          const newPage = Math.max(1, prev - 1);
          if (newPage !== prev) setTimeout(scrollToTable, 50);
          return newPage;
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentPage(prev => {
          if (!calculation) return prev;

          // Determine total pages based on distinct years in the schedule
          const years = new Set<number>();
          calculation.schedule.forEach(row => years.add(row.year));
          const totalYears = years.size || 1;
          const maxPage = Math.max(1, Math.ceil(totalYears / yearsPerPage));

          const newPage = Math.min(maxPage, prev + 1);
          if (newPage !== prev) setTimeout(scrollToTable, 50);
          return newPage;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSchedule, calculation, yearsPerPage]);

  const handleShare = async () => {
    const params = new URLSearchParams({
      view: 'schedule',
      amount: loanAmount.toString(),
      rate: interestRate.toString(),
      tenure: loanTenure.toString(),
      startMonth: startMonth.toString(),
      startYear: startYear.toString(),
    });

    if (partPayments.length > 0) {
      params.set('partPayments', JSON.stringify(partPayments));
    }

    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'EMI Schedule',
          text: `Check out this EMI schedule: EMI ₹${calculation?.emi.toLocaleString('en-IN')}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('Schedule link copied to clipboard!');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error sharing:', error);
      }
    }
  };

  const toggleYear = (year: number) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

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

  const formatAmount = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)} L`;
    } else {
      return `₹${(amount / 1000).toFixed(0)}K`;
    }
  };

  const getFullMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  // Group schedule data by year
  const getYearlyData = () => {
    const originalPrincipal = calculation.totalAmount - calculation.totalInterest;
    const yearlyData: { [key: number]: {
      year: number;
      months: typeof calculation.schedule;
      totalEmi: number;
      totalPrincipal: number;
      totalInterest: number;
      totalPartPayment: number;
      endBalance: number;
      loanPaidPercentage: number;
    } } = {};

    calculation.schedule.forEach((row) => {
      if (!yearlyData[row.year]) {
        yearlyData[row.year] = {
          year: row.year,
          months: [],
          totalEmi: 0,
          totalPrincipal: 0,
          totalInterest: 0,
          totalPartPayment: 0,
          endBalance: row.remainingBalance,
          loanPaidPercentage: 0,
        };
      }
      
      yearlyData[row.year].months.push(row);
      yearlyData[row.year].totalEmi += row.emiAmount;
      yearlyData[row.year].totalPrincipal += row.principalAmount;
      yearlyData[row.year].totalInterest += row.interestAmount;
      yearlyData[row.year].totalPartPayment += row.partPayment;
      yearlyData[row.year].endBalance = row.remainingBalance; // Keep updating to get end balance
      yearlyData[row.year].loanPaidPercentage = ((originalPrincipal - row.remainingBalance) / originalPrincipal) * 100;
    });

    return Object.values(yearlyData).sort((a, b) => a.year - b.year);
  };

  const yearlyData = getYearlyData();
  const totalPrincipal = calculation.totalAmount - calculation.totalInterest;

  // Pagination logic
  const totalPages = Math.ceil(yearlyData.length / yearsPerPage);
  const startIndex = (currentPage - 1) * yearsPerPage;
  const endIndex = startIndex + yearsPerPage;
  const paginatedYearlyData = yearlyData.slice(startIndex, endIndex);


  const handleGoToPage = (page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
      setTimeout(scrollToTable, 50);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Action Buttons Row - Only show if not hidden */}
      {!hideActionButtons && (
        <div className="flex justify-center gap-3 flex-wrap">
          <Button
            onClick={() => setShowPrepayments(!showPrepayments)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            {showPrepayments ? 'Hide Part Payments' : 'Add Part Payments'}
          </Button>
          <Button
            onClick={() => setShowComparison(!showComparison)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <GitCompare className="w-4 h-4" />
            {showComparison ? 'Hide Comparison' : 'Compare Loan Scenarios'}
          </Button>
          <Button
            onClick={() => setShowSchedule(!showSchedule)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            {showSchedule ? 'Hide EMI Schedule' : 'Show EMI Schedule'}
          </Button>
        </div>
      )}

      {!hideActionButtons && showPrepayments && (
        <PartPaymentSection
          partPayments={partPayments}
          setPartPayments={setPartPayments}
          startMonth={startMonth}
          startYear={startYear}
          loanTenure={loanTenure}
          loanSchedule={calculation.schedule}
        />
      )}

      {!hideActionButtons && showComparison && (
        <LoanComparisonSection
          baseAmount={baseAmount || loanAmount}
          baseRate={baseRate || interestRate}
          baseTenure={baseTenure || loanTenure}
          basePartPayments={partPayments}
          startMonth={startMonth}
          startYear={startYear}
        />
      )}


      {showSchedule && (
        <>
          {/* EMI Reduction Summary - Only when there are reduce-emi payments */}
          {(() => {
            const hasReduceEMIPayments = partPayments.some(pp => pp.strategy === 'reduce-emi');
            if (!hasReduceEMIPayments) return null;
            const firstEMI = calculation.schedule[0]?.emiAmount || 0;
            const lastEMI = calculation.schedule[calculation.schedule.length - 2]?.emiAmount || 0;
            let emiChanges = 0;
            
            for (let i = 1; i < calculation.schedule.length - 1; i++) {
              if (Math.abs(calculation.schedule[i].emiAmount - calculation.schedule[i-1].emiAmount) > 1) {
                emiChanges++;
              }
            }
            
            const emiReduction = firstEMI - lastEMI;
            const reductionPercentage = ((emiReduction / firstEMI) * 100).toFixed(1);
            
            return (
              <Card className="bg-card shadow-card border border-border mb-6">
                <CardHeader className="bg-gradient-to-r from-financial-success to-financial-primary text-primary-foreground rounded-t-lg py-3">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <TrendingDown className="w-5 h-5" />
                    EMI Reduction Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">EMI Changes</p>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {emiChanges}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Original EMI</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(firstEMI)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Final EMI</p>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(lastEMI)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Reduction</p>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(emiReduction)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">% Reduced</p>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {reductionPercentage}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Yearly Payments Chart */}
          <Card className="bg-card shadow-card border border-border mb-6">
            <CardHeader className="bg-gradient-to-r from-financial-success to-financial-primary text-primary-foreground rounded-t-lg py-3">
              <CardTitle className="text-xl font-semibold">Yearly Payments & Remaining Balance</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={yearlyData.map(year => ({
                      year: year.year,
                      principal: year.totalPrincipal,
                      interest: year.totalInterest,
                      partPayment: year.totalPartPayment,
                      balance: year.endBalance
                    }))} 
                    barCategoryGap="10%"
                    onMouseLeave={() => setHoveredElement(null)}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="year" 
                      stroke="hsl(var(--foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="hsl(var(--foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `${Math.round(value / 1000)}K`}
                      tickMargin={12}
                      width={100}
                      label={{ value: 'Loan Payment / year', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))' } }}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `${Math.round(value / 100000)}L`}
                      tickMargin={12}
                      width={100}
                      label={{ value: 'Balance Amount', angle: 90, position: 'insideRight', offset: 10, style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' } }}
                    />
                    <RechartsTooltip 
                      formatter={(value: number, name: string) => {
                        let label = name;
                        if (name === 'Principal') label = 'Principal';
                        else if (name === 'Interest') label = 'Interest';
                        else if (name === 'Part Payment') label = 'Part Payment';
                        else if (name === 'Remaining Balance') label = 'Remaining Balance';
                        return [formatCurrency(value), label];
                      }}
                      labelFormatter={(year) => `Year ${year}`}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="principal" 
                      fill="hsl(var(--financial-primary))" 
                      name="Principal"
                      radius={[2, 2, 0, 0]}
                      onMouseEnter={() => setHoveredElement('principal')}
                      style={{
                        opacity: hoveredElement === null || hoveredElement === 'principal' ? 1 : 0.3,
                        filter: hoveredElement === 'principal' ? 'brightness(1.3)' : 'none',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="interest" 
                      fill="hsl(var(--destructive))" 
                      name="Interest"
                      radius={[2, 2, 0, 0]}
                      onMouseEnter={() => setHoveredElement('interest')}
                      style={{
                        opacity: hoveredElement === null || hoveredElement === 'interest' ? 1 : 0.3,
                        filter: hoveredElement === 'interest' ? 'brightness(1.3)' : 'none',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                    />
                    {partPayments.length > 0 && (
                      <Bar 
                        yAxisId="left"
                        dataKey="partPayment" 
                        fill="hsl(142, 70%, 35%)" 
                        name="Part Payment"
                        radius={[2, 2, 0, 0]}
                        onMouseEnter={() => setHoveredElement('partPayment')}
                        style={{
                          opacity: hoveredElement === null || hoveredElement === 'partPayment' ? 1 : 0.3,
                          filter: hoveredElement === 'partPayment' ? 'brightness(1.3)' : 'none',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer'
                        }}
                      />
                    )}
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="balance"
                      stroke="hsl(25, 85%, 45%)"
                      strokeWidth={3}
                      name="Remaining Balance"
                      dot={{ fill: 'hsl(25, 85%, 45%)', strokeWidth: 2, r: 4 }}
                      onMouseEnter={() => setHoveredElement('balance')}
                      style={{
                        opacity: hoveredElement === null || hoveredElement === 'balance' ? 1 : 0.3,
                        filter: hoveredElement === 'balance' ? 'brightness(1.3) drop-shadow(0 0 8px hsl(25, 85%, 45%))' : 'none',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* EMI Schedule Table */}
          <Card className="bg-card shadow-card border border-border">
            <CardHeader className="bg-gradient-to-r from-financial-success to-financial-primary text-primary-foreground rounded-t-lg py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold">EMI Schedule</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 bg-primary-foreground/20 border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/30 hover:text-primary-foreground"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 bg-primary-foreground/20 border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/30 hover:text-primary-foreground"
                  onClick={() => exportDetailedPDFReport(
                    calculation.schedule, 
                    calculation.emi, 
                    calculation.totalInterest, 
                    calculation.totalAmount, 
                    partPayments,
                    {
                      loanAmount,
                      interestRate,
                      loanTenure,
                      startMonth,
                      startYear
                    }
                  )}
                >
                  <FileText className="h-4 w-4" />
                  Full Report
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 bg-primary-foreground/20 border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/30 hover:text-primary-foreground">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportToExcel(calculation.schedule, calculation.emi, calculation.totalInterest, calculation.totalAmount, partPayments)}>
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportToPDF(calculation.schedule, calculation.emi, calculation.totalInterest, calculation.totalAmount, partPayments)}>
                      PDF (.pdf)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportToJSON(calculation.schedule, calculation.emi, calculation.totalInterest, calculation.totalAmount, partPayments)}>
                      JSON (.json)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportToCSV(calculation.schedule, calculation.emi, calculation.totalInterest, calculation.totalAmount, partPayments)}>
                      CSV (.csv)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
        </CardHeader>
        <CardContent>
          <div ref={tableContainerRef} className="border rounded-md scroll-mt-4">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-b">
                  <TableHead className="w-12 font-bold uppercase">×</TableHead>
                  <TableHead className="w-20 font-bold uppercase">Year</TableHead>
                  <TableHead className="text-right font-bold uppercase">Principal</TableHead>
                  {partPayments.length > 0 && (
                    <TableHead className="text-right font-bold uppercase">Part Payment</TableHead>
                  )}
                  <TableHead className="text-right font-bold uppercase">Interest</TableHead>
                  <TableHead className="text-right font-bold uppercase">EMI</TableHead>
                  <TableHead className="text-right font-bold uppercase">Balance</TableHead>
                  <TableHead className="text-right font-bold uppercase">Paid %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedYearlyData.map((yearData) => (
                  <>
                    {/* Year Summary Row */}
                    <TableRow 
                      key={`year-${yearData.year}`}
                      className="bg-muted/50 hover:bg-muted/70 cursor-pointer border-b-2"
                      onClick={() => toggleYear(yearData.year)}
                    >
                      <TableCell className="text-center">
                        {expandedYears.has(yearData.year) ? (
                          <Minus className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-bold">{yearData.year}</TableCell>
                      <TableCell className="text-right font-bold text-financial-primary">
                        {formatCurrency(yearData.totalPrincipal)}
                      </TableCell>
                      {partPayments.length > 0 && (
                        <TableCell className="text-right font-bold" style={{ color: 'hsl(142, 70%, 35%)' }}>
                          {yearData.totalPartPayment > 0 ? formatCurrency(yearData.totalPartPayment) : '-'}
                        </TableCell>
                      )}
                      <TableCell className="text-right font-bold text-destructive">
                        {formatCurrency(yearData.totalInterest)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(yearData.totalEmi)}
                      </TableCell>
                      <TableCell className="text-right font-bold" style={{ color: 'hsl(25, 85%, 45%)' }}>
                        {formatCurrency(yearData.endBalance)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {yearData.loanPaidPercentage.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                    
                    {/* Monthly Detail Rows */}
                    {expandedYears.has(yearData.year) && yearData.months.map((row, monthIndex) => {
                      // Check if EMI changed (when previous month had reduce-emi part payment)
                      const previousRow = monthIndex > 0 ? yearData.months[monthIndex - 1] : null;
                      const emiChanged = previousRow && Math.abs(row.emiAmount - previousRow.emiAmount) > 1;
                      const emiReduced = emiChanged && row.emiAmount < previousRow!.emiAmount;
                      
                      return (
                        <TableRow key={`${yearData.year}-${monthIndex}`} className="bg-background hover:bg-muted/30 transition-colors">
                          <TableCell></TableCell>
                          <TableCell className="text-muted-foreground pl-4">
                            {getFullMonthName(row.month)}
                          </TableCell>
                          <TableCell className="text-right text-financial-primary">
                            {formatCurrency(row.principalAmount)}
                          </TableCell>
                          {partPayments.length > 0 && (
                            <TableCell className="text-right" style={{ color: 'hsl(142, 70%, 35%)' }}>
                              {row.partPayment > 0 ? formatCurrency(row.partPayment) : '-'}
                            </TableCell>
                          )}
                          <TableCell className="text-right text-destructive">
                            {formatCurrency(row.interestAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {formatCurrency(row.emiAmount)}
                              {emiReduced && (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                  <TrendingDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    EMI ↓
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right" style={{ color: 'hsl(25, 85%, 45%)' }}>
                            {formatCurrency(row.remainingBalance)}
                          </TableCell>
                          <TableCell className="text-right">
                            {(((totalPrincipal - row.remainingBalance) / totalPrincipal) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Show</span>
                <Select
                  value={yearsPerPage.toString()}
                  onValueChange={(value) => {
                    setYearsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
                <span>years per page</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {startIndex + 1}-{Math.min(endIndex, yearlyData.length)} of {yearlyData.length} years
                </span>
                
                {/* Go to specific year dropdown */}
                <Select
                  value=""
                  onValueChange={(value) => {
                    const yearIndex = yearlyData.findIndex(y => y.year === Number(value));
                    if (yearIndex !== -1) {
                      const targetPage = Math.floor(yearIndex / yearsPerPage) + 1;
                      setCurrentPage(targetPage);
                    }
                  }}
                >
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue placeholder="Go to year..." />
                  </SelectTrigger>
                  <SelectContent>
                    {yearlyData.map((yearData) => (
                      <SelectItem key={yearData.year} value={yearData.year.toString()}>{yearData.year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleGoToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-popover text-popover-foreground border">
                        <p className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">←</kbd> Previous page
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Page indicator */}
                  <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-md">
                    <span className="text-sm font-medium text-foreground">{currentPage}</span>
                    <span className="text-sm text-muted-foreground">/</span>
                    <span className="text-sm text-muted-foreground">{totalPages}</span>
                  </div>

                  {/* Page dots for visual indication */}
                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          className={`w-2 h-2 rounded-full transition-all ${
                            currentPage === pageNum 
                              ? 'bg-primary w-4' 
                              : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                          }`}
                          onClick={() => handleGoToPage(pageNum)}
                          aria-label={`Go to page ${pageNum}`}
                        />
                      );
                    })}
                  </div>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleGoToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-popover text-popover-foreground border">
                        <p className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">→</kbd> Next page
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Keyboard shortcut hint */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-muted/30 rounded text-xs text-muted-foreground cursor-help">
                          <Keyboard className="h-3 w-3" />
                          <span>← →</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-popover text-popover-foreground border">
                        <p className="text-sm">Use arrow keys to navigate pages</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
};
