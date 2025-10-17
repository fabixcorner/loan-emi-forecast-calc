import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ScheduleRow {
  month: number;
  year: number;
  emiAmount: number;
  principalAmount: number;
  interestAmount: number;
  remainingBalance: number;
  partPayment: number;
}

const getMonthName = (month: number) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1];
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
};

export const exportToExcel = (schedule: ScheduleRow[], emi: number, totalInterest: number, totalAmount: number) => {
  const data = schedule.map((row, index) => ({
    'Sr. No.': index + 1,
    'Month': getMonthName(row.month),
    'Year': row.year,
    'EMI Amount': row.emiAmount,
    'Principal Amount': row.principalAmount,
    'Interest Amount': row.interestAmount,
    'Part Payment': row.partPayment,
    'Remaining Balance': row.remainingBalance,
  }));

  // Add summary at the end
  data.push({
    'Sr. No.': '' as any,
    'Month': '' as any,
    'Year': 'SUMMARY' as any,
    'EMI Amount': emi,
    'Principal Amount': totalAmount - totalInterest,
    'Interest Amount': totalInterest,
    'Part Payment': schedule.reduce((sum, row) => sum + row.partPayment, 0),
    'Remaining Balance': 0,
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'EMI Schedule');
  
  // Auto-size columns
  const max_width = data.reduce((w, r) => Math.max(w, r['Month'].length), 10);
  ws['!cols'] = [
    { wch: 8 },
    { wch: max_width },
    { wch: 8 },
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
    { wch: 20 },
  ];

  XLSX.writeFile(wb, 'EMI_Schedule.xlsx');
};

export const exportToPDF = (schedule: ScheduleRow[], emi: number, totalInterest: number, totalAmount: number) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text('EMI Schedule', 14, 22);
  
  // Summary information
  doc.setFontSize(11);
  doc.text(`Monthly EMI: ${formatCurrency(emi)}`, 14, 32);
  doc.text(`Total Amount: ${formatCurrency(totalAmount)}`, 14, 38);
  doc.text(`Total Interest: ${formatCurrency(totalInterest)}`, 14, 44);
  
  // Table data
  const tableData = schedule.map((row, index) => [
    index + 1,
    getMonthName(row.month),
    row.year,
    formatCurrency(row.emiAmount),
    formatCurrency(row.principalAmount),
    formatCurrency(row.interestAmount),
    row.partPayment > 0 ? formatCurrency(row.partPayment) : '-',
    formatCurrency(row.remainingBalance),
  ]);

  autoTable(doc, {
    startY: 50,
    head: [['#', 'Month', 'Year', 'EMI', 'Principal', 'Interest', 'Part Payment', 'Balance']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 139, 202] },
  });

  doc.save('EMI_Schedule.pdf');
};

export const exportToJSON = (schedule: ScheduleRow[], emi: number, totalInterest: number, totalAmount: number) => {
  const data = {
    summary: {
      monthlyEMI: emi,
      totalAmount: totalAmount,
      totalInterest: totalInterest,
      totalPrincipal: totalAmount - totalInterest,
    },
    schedule: schedule.map((row, index) => ({
      serialNo: index + 1,
      month: getMonthName(row.month),
      year: row.year,
      emiAmount: row.emiAmount,
      principalAmount: row.principalAmount,
      interestAmount: row.interestAmount,
      partPayment: row.partPayment,
      remainingBalance: row.remainingBalance,
    })),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'EMI_Schedule.json';
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToCSV = (schedule: ScheduleRow[], emi: number, totalInterest: number, totalAmount: number) => {
  const headers = ['Sr. No.', 'Month', 'Year', 'EMI Amount', 'Principal Amount', 'Interest Amount', 'Part Payment', 'Remaining Balance'];
  
  const rows = schedule.map((row, index) => [
    index + 1,
    getMonthName(row.month),
    row.year,
    row.emiAmount.toFixed(2),
    row.principalAmount.toFixed(2),
    row.interestAmount.toFixed(2),
    row.partPayment.toFixed(2),
    row.remainingBalance.toFixed(2),
  ]);

  // Add summary row
  rows.push([
    '',
    '',
    'SUMMARY',
    emi.toFixed(2),
    (totalAmount - totalInterest).toFixed(2),
    totalInterest.toFixed(2),
    schedule.reduce((sum, row) => sum + row.partPayment, 0).toFixed(2),
    '0.00',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'EMI_Schedule.csv';
  a.click();
  URL.revokeObjectURL(url);
};
