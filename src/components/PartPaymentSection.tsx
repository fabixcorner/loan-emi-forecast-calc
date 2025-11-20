import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Clock, TrendingDown, Edit2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface PartPayment {
  id: string;
  month: number;
  year: number;
  amount: number;
  frequency: 'one-time' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
  strategy: 'reduce-tenure' | 'reduce-emi';
}

interface PartPaymentSectionProps {
  partPayments: PartPayment[];
  setPartPayments: (payments: PartPayment[]) => void;
  startMonth: number;
  startYear: number;
  loanTenure: number;
  loanSchedule: {
    month: number;
    year: number;
    remainingBalance: number;
  }[];
  onPartPaymentAdded?: () => void;
}

export const PartPaymentSection = ({
  partPayments,
  setPartPayments,
  startMonth,
  startYear,
  loanTenure,
  loanSchedule,
  onPartPaymentAdded,
}: PartPaymentSectionProps) => {
  const [newPayment, setNewPayment] = useState<Omit<PartPayment, 'id'>>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: 100000,
    frequency: 'one-time',
    strategy: 'reduce-tenure',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const addPartPayment = () => {
    if (newPayment.amount > 0) {
      // Get actual end date from loan schedule (accounts for existing part payments)
      const lastScheduleEntry = loanSchedule[loanSchedule.length - 1];
      const endMonth = lastScheduleEntry?.month || startMonth;
      const endYear = lastScheduleEntry?.year || startYear;
      
      // Convert dates to comparable values (year * 12 + month)
      const paymentDate = newPayment.year * 12 + newPayment.month;
      const startDate = startYear * 12 + startMonth;
      const endDate = endYear * 12 + endMonth;
      
      // Validate if payment date is within actual remaining loan schedule
      if (paymentDate < startDate || paymentDate > endDate) {
        toast({
          variant: "destructive",
          title: "Invalid Part Payment Date",
          description: `Part payments are accepted only between ${getMonthName(startMonth)} ${startYear} and ${getMonthName(endMonth)} ${endYear}. Loan ends at ${getMonthName(endMonth)} ${endYear} with current part payments.`,
        });
        return;
      }
      
      // Check for duplicate date with other existing payments (excluding current payment if editing)
      const conflictingPayment = partPayments.find(
        payment => payment.id !== editingId && 
                   payment.month === newPayment.month && 
                   payment.year === newPayment.year
      );
      
      if (conflictingPayment) {
        toast({
          variant: "destructive",
          title: "Duplicate Part Payment Date",
          description: `A part payment already exists for ${getMonthName(newPayment.month)} ${newPayment.year}. Please choose a different date or edit the existing payment.`,
        });
        return;
      }
      
      // Find the remaining balance for the specified month and year
      const scheduleEntry = loanSchedule.find(
        (entry) => entry.month === newPayment.month && entry.year === newPayment.year
      );
      
      if (!scheduleEntry) {
        toast({
          variant: "destructive",
          title: "Invalid Part Payment Date",
          description: `No remaining balance for ${getMonthName(newPayment.month)} ${newPayment.year}. Loan ends at ${getMonthName(endMonth)} ${endYear} with current part payments.`,
        });
        return;
      }
      
      // Calculate total existing payment amount for this month (excluding current payment if editing)
      const existingPaymentAmount = partPayments
        .filter(p => p.id !== editingId && p.month === newPayment.month && p.year === newPayment.year)
        .reduce((sum, p) => sum + p.amount, 0);
      
      // Check if new amount plus existing payments exceed remaining balance
      if (newPayment.amount + existingPaymentAmount >= scheduleEntry.remainingBalance) {
        toast({
          variant: "destructive",
          title: "Invalid Part Payment Amount",
          description: `Amount ${existingPaymentAmount > 0 ? `(including existing payment of ${formatAmount(existingPaymentAmount)}) ` : ''}exceeds remaining loan amount of ${formatAmount(scheduleEntry.remainingBalance)} for ${getMonthName(newPayment.month)} ${newPayment.year}`,
        });
        return;
      }
      
      if (editingId) {
        // Update existing payment
        const updatedPayments = partPayments.map(payment => 
          payment.id === editingId ? { ...newPayment, id: editingId } : payment
        ).sort((a, b) => {
          if (a.year !== b.year) {
            return a.year - b.year;
          }
          return a.month - b.month;
        });
        setPartPayments(updatedPayments);
        toast({
          title: "Part Payment Updated",
          description: `Updated payment for ${getMonthName(newPayment.month)} ${newPayment.year}`,
        });
      } else {
        // Add new payment
        const id = Date.now().toString();
        const updatedPayments = [...partPayments, { ...newPayment, id }].sort((a, b) => {
          if (a.year !== b.year) {
            return a.year - b.year;
          }
          return a.month - b.month;
        });
        setPartPayments(updatedPayments);
      }
      
      // Reset form
      setNewPayment({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        amount: 100000,
        frequency: 'one-time',
        strategy: 'reduce-tenure',
      });
      setEditingId(null);
      onPartPaymentAdded?.();
    }
  };

  const editPartPayment = (payment: PartPayment) => {
    setNewPayment({
      month: payment.month,
      year: payment.year,
      amount: payment.amount,
      frequency: payment.frequency,
      strategy: payment.strategy,
    });
    setEditingId(payment.id);
  };

  const cancelEdit = () => {
    setNewPayment({
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      amount: 100000,
      frequency: 'one-time',
      strategy: 'reduce-tenure',
    });
    setEditingId(null);
  };

  const removePartPayment = (id: string) => {
    setPartPayments(partPayments.filter(payment => payment.id !== id));
  };

  const getYearOptions = () => {
    // Get actual end date from loan schedule (accounts for existing part payments)
    const lastScheduleEntry = loanSchedule[loanSchedule.length - 1];
    const endYear = lastScheduleEntry?.year || startYear;
    
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }
    return years;
  };

  const getMonthOptions = () => {
    // Get actual end date from loan schedule (accounts for existing part payments)
    const lastScheduleEntry = loanSchedule[loanSchedule.length - 1];
    const endMonth = lastScheduleEntry?.month || startMonth;
    const endYear = lastScheduleEntry?.year || startYear;
    
    const months = [];
    
    for (let i = 1; i <= 12; i++) {
      // If selected year is start year, only show months from startMonth onwards
      if (newPayment.year === startYear && i < startMonth) {
        continue;
      }
      // If selected year is end year, only show months up to endMonth
      if (newPayment.year === endYear && i > endMonth) {
        continue;
      }
      months.push(i);
    }
    
    return months;
  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
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

  return (
    <Card className="h-fit glass-card shadow-[var(--shadow-card)]">
      <CardHeader className="bg-gradient-to-r from-financial-success to-financial-primary text-white rounded-t-lg py-3">
        <CardTitle className="text-xl font-semibold">Part Payment Adjustments</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Add New Part Payment */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">
                {editingId ? 'Edit Part Payment' : 'Add Part Payment'}
              </h4>
              {editingId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelEdit}
                  className="h-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground w-20 shrink-0">Date</Label>
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <Select 
                    value={newPayment.month.toString()} 
                    onValueChange={(value) => setNewPayment(prev => ({ ...prev, month: parseInt(value) }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getMonthOptions().map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {getMonthName(month)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select 
                    value={newPayment.year.toString()} 
                    onValueChange={(value) => setNewPayment(prev => ({ ...prev, year: parseInt(value) }))}
                  >
                    <SelectTrigger className="h-9">
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

              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground w-20 shrink-0">Amount</Label>
                <Input
                  type="number"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  className="h-9"
                  min={50000}
                  step={10000}
                  placeholder="₹"
                />
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground w-20 shrink-0">Frequency</Label>
                <Select 
                  value={newPayment.frequency} 
                  onValueChange={(value: 'one-time' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly') => setNewPayment(prev => ({ ...prev, frequency: value }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-time">One-time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground w-20 shrink-0">Strategy</Label>
                <div className="flex gap-2 flex-1">
                  <Button
                    type="button"
                    variant={newPayment.strategy === 'reduce-tenure' ? 'default' : 'outline'}
                    onClick={() => setNewPayment({ ...newPayment, strategy: 'reduce-tenure' })}
                    className="flex-1"
                    size="sm"
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    Tenure
                  </Button>
                  <Button
                    type="button"
                    variant={newPayment.strategy === 'reduce-emi' ? 'default' : 'outline'}
                    onClick={() => setNewPayment({ ...newPayment, strategy: 'reduce-emi' })}
                    className="flex-1"
                    size="sm"
                  >
                    <TrendingDown className="w-4 h-4 mr-1" />
                    EMI
                  </Button>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={addPartPayment} 
              className="w-full h-9 bg-financial-success hover:bg-financial-success/90"
              size="sm"
            >
              {editingId ? (
                <>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Update Payment
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Payment
                </>
              )}
            </Button>
          </div>

          {/* Existing Part Payments */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-foreground">Scheduled Part Payments</h4>
            {partPayments.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {partPayments.map((payment) => (
                  <div 
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-financial-card border border-financial-border rounded-lg"
                  >
                     <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {getMonthName(payment.month)} {payment.year}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{formatAmount(payment.amount)} • {payment.frequency === 'one-time' ? 'One-time' : payment.frequency === 'half-yearly' ? 'Half-Yearly' : payment.frequency.charAt(0).toUpperCase() + payment.frequency.slice(1)}</span>
                        <span className="flex items-center gap-1">
                          {payment.strategy === 'reduce-tenure' ? (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>Tenure</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>EMI</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editPartPayment(payment)}
                        className="h-8 w-8 p-0 text-primary hover:text-primary"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePartPayment(payment.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                No part payments scheduled yet
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
