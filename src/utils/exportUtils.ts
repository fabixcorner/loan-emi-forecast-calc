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
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatCurrencyForPDF = (amount: number) => {
  return '₹ ' + new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
};

export const exportToExcel = (schedule: ScheduleRow[], emi: number, totalInterest: number, totalAmount: number) => {
  const data = schedule.map((row, index) => ({
    'Sr. No.': index + 1,
    'Month': getMonthName(row.month),
    'Year': row.year,
    'EMI Amount': Math.round(row.emiAmount),
    'Principal Amount': Math.round(row.principalAmount),
    'Interest Amount': Math.round(row.interestAmount),
    'Part Payment': Math.round(row.partPayment),
    'Remaining Balance': Math.round(row.remainingBalance),
  }));

  // Add summary at the end
  data.push({
    'Sr. No.': '' as any,
    'Month': '' as any,
    'Year': 'SUMMARY' as any,
    'EMI Amount': Math.round(emi),
    'Principal Amount': Math.round(totalAmount - totalInterest),
    'Interest Amount': Math.round(totalInterest),
    'Part Payment': Math.round(schedule.reduce((sum, row) => sum + row.partPayment, 0)),
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
  doc.text(`Monthly EMI: ${formatCurrencyForPDF(emi)}`, 14, 32);
  doc.text(`Total Amount: ${formatCurrencyForPDF(totalAmount)}`, 14, 38);
  doc.text(`Total Interest: ${formatCurrencyForPDF(totalInterest)}`, 14, 44);
  
  // Table data
  const tableData = schedule.map((row, index) => [
    index + 1,
    getMonthName(row.month),
    row.year,
    formatCurrencyForPDF(row.emiAmount),
    formatCurrencyForPDF(row.principalAmount),
    formatCurrencyForPDF(row.interestAmount),
    row.partPayment > 0 ? formatCurrencyForPDF(row.partPayment) : '-',
    formatCurrencyForPDF(row.remainingBalance),
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
    Math.round(row.emiAmount),
    Math.round(row.principalAmount),
    Math.round(row.interestAmount),
    Math.round(row.partPayment),
    Math.round(row.remainingBalance),
  ]);

  // Add summary row
  rows.push([
    '',
    '',
    'SUMMARY',
    Math.round(emi),
    Math.round(totalAmount - totalInterest),
    Math.round(totalInterest),
    Math.round(schedule.reduce((sum, row) => sum + row.partPayment, 0)),
    '0',
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
