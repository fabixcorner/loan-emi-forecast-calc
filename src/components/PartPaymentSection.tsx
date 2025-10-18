import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface PartPayment {
  id: string;
  month: number;
  year: number;
  amount: number;
  frequency: 'one-time' | 'monthly' | 'quarterly' | 'yearly';
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
}

export const PartPaymentSection = ({
  partPayments,
  setPartPayments,
  startMonth,
  startYear,
  loanTenure,
  loanSchedule,
}: PartPaymentSectionProps) => {
  const [newPayment, setNewPayment] = useState<Omit<PartPayment, 'id'>>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: 100000,
    frequency: 'one-time',
  });

  const addPartPayment = () => {
    if (newPayment.amount > 0) {
      // Calculate end month and year
      const totalMonths = loanTenure * 12;
      const endMonth = (startMonth - 1 + totalMonths) % 12;
      const endYear = startYear + Math.floor((startMonth - 1 + totalMonths) / 12);
      
      // Convert dates to comparable values (year * 12 + month)
      const paymentDate = newPayment.year * 12 + newPayment.month;
      const startDate = startYear * 12 + startMonth;
      const endDate = endYear * 12 + endMonth;
      
      // Validate if payment date is within loan schedule
      if (paymentDate < startDate || paymentDate > endDate) {
        toast({
          variant: "destructive",
          title: "Invalid Part Payment Date",
          description: `Part payments are accepted only between ${getMonthName(startMonth)} ${startYear} and ${getMonthName(endMonth)} ${endYear}`,
        });
        return;
      }
      
      // Find the remaining balance for the specified month and year
      const scheduleEntry = loanSchedule.find(
        (entry) => entry.month === newPayment.month && entry.year === newPayment.year
      );
      
      if (scheduleEntry && newPayment.amount >= scheduleEntry.remainingBalance) {
        toast({
          variant: "destructive",
          title: "Invalid Part Payment Amount",
          description: `Amount is more than remaining loan amount of ${formatAmount(scheduleEntry.remainingBalance)} for ${getMonthName(newPayment.month)} ${newPayment.year}`,
        });
        return;
      }
      
      const id = Date.now().toString();
      const updatedPayments = [...partPayments, { ...newPayment, id }].sort((a, b) => {
        // Sort by year first, then by month
        if (a.year !== b.year) {
          return a.year - b.year;
        }
        return a.month - b.month;
      });
      setPartPayments(updatedPayments);
      setNewPayment({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        amount: 100000,
        frequency: 'one-time',
      });
    }
  };

  const removePartPayment = (id: string) => {
    setPartPayments(partPayments.filter(payment => payment.id !== id));
  };

  const getYearOptions = () => {
    const totalMonths = loanTenure * 12;
    const endYear = startYear + Math.floor((startMonth - 1 + totalMonths) / 12);
    
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }
    return years;
  };

  const getMonthOptions = () => {
    const totalMonths = loanTenure * 12;
    const endMonth = (startMonth - 1 + totalMonths) % 12 || 12;
    const endYear = startYear + Math.floor((startMonth - 1 + totalMonths) / 12);
    
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
      <CardHeader className="bg-gradient-to-r from-financial-success to-financial-primary text-white rounded-t-lg">
        <CardTitle className="text-xl font-semibold">Part Payment Adjustments</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Add New Part Payment */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-foreground">Add Part Payment</h4>
            
            <div className="space-y-3">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-sm text-muted-foreground">Month</Label>
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
                </div>
                
                <div className="flex-1">
                  <Label className="text-sm text-muted-foreground">Year</Label>
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

                <div className="flex-1">
                  <Label className="text-sm text-muted-foreground">Amount (₹)</Label>
                  <Input
                    type="number"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="h-9"
                    min={1000}
                    step={1000}
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Frequency</Label>
                <Select 
                  value={newPayment.frequency} 
                  onValueChange={(value: 'one-time' | 'monthly' | 'quarterly' | 'yearly') => setNewPayment(prev => ({ ...prev, frequency: value }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-time">One-time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button 
              onClick={addPartPayment} 
              className="w-full h-9 bg-financial-success hover:bg-financial-success/90"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Payment
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
                      <div className="text-xs text-muted-foreground">
                        {formatAmount(payment.amount)} • {payment.frequency === 'one-time' ? 'One-time' : payment.frequency.charAt(0).toUpperCase() + payment.frequency.slice(1)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePartPayment(payment.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
