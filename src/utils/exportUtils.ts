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

export const exportToExcel = (schedule: ScheduleRow[], emi: number, totalInterest: number, totalAmount: number, partPayments?: any[]) => {
  const hasVariableEMI = schedule.length > 1 && 
    schedule.some((row, idx) => idx > 0 && Math.abs(row.emiAmount - schedule[idx - 1].emiAmount) > 1);
  const avgEMI = hasVariableEMI ? schedule.reduce((sum, row) => sum + row.emiAmount, 0) / schedule.length : emi;
  
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
    'EMI Amount': Math.round(hasVariableEMI ? avgEMI : emi),
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

export const exportToPDF = (schedule: ScheduleRow[], emi: number, totalInterest: number, totalAmount: number, partPayments?: any[]) => {
  const doc = new jsPDF();
  const hasVariableEMI = schedule.length > 1 && 
    schedule.some((row, idx) => idx > 0 && Math.abs(row.emiAmount - schedule[idx - 1].emiAmount) > 1);
  const avgEMI = hasVariableEMI ? schedule.reduce((sum, row) => sum + row.emiAmount, 0) / schedule.length : emi;
  
  // Title
  doc.setFontSize(18);
  doc.text('EMI Schedule', 14, 22);
  
  // Summary information
  doc.setFontSize(11);
  doc.text(`${hasVariableEMI ? 'Avg. ' : ''}Monthly EMI: ${formatCurrencyForPDF(hasVariableEMI ? avgEMI : emi)}`, 14, 32);
  doc.text(`Total Amount: ${formatCurrencyForPDF(totalAmount)}`, 14, 38);
  doc.text(`Total Interest: ${formatCurrencyForPDF(totalInterest)}`, 14, 44);
  if (hasVariableEMI) {
    doc.setFontSize(9);
    doc.text('Note: EMI amounts vary due to part payment strategies', 14, 50);
  }
  
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
    startY: hasVariableEMI ? 56 : 50,
    head: [['#', 'Month', 'Year', 'EMI', 'Principal', 'Interest', 'Part Payment', 'Balance']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 139, 202] },
  });

  doc.save('EMI_Schedule.pdf');
};

export const exportToJSON = (schedule: ScheduleRow[], emi: number, totalInterest: number, totalAmount: number, partPayments?: any[]) => {
  const hasVariableEMI = schedule.length > 1 && 
    schedule.some((row, idx) => idx > 0 && Math.abs(row.emiAmount - schedule[idx - 1].emiAmount) > 1);
  const avgEMI = hasVariableEMI ? schedule.reduce((sum, row) => sum + row.emiAmount, 0) / schedule.length : emi;
  
  const data = {
    summary: {
      monthlyEMI: hasVariableEMI ? avgEMI : emi,
      totalAmount: totalAmount,
      totalInterest: totalInterest,
      totalPrincipal: totalAmount - totalInterest,
      isVariableEMI: hasVariableEMI,
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

export const exportToCSV = (schedule: ScheduleRow[], emi: number, totalInterest: number, totalAmount: number, partPayments?: any[]) => {
  const hasVariableEMI = schedule.length > 1 && 
    schedule.some((row, idx) => idx > 0 && Math.abs(row.emiAmount - schedule[idx - 1].emiAmount) > 1);
  const avgEMI = hasVariableEMI ? schedule.reduce((sum, row) => sum + row.emiAmount, 0) / schedule.length : emi;
  
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
    Math.round(hasVariableEMI ? avgEMI : emi),
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

interface DetailedReportOptions {
  loanAmount: number;
  interestRate: number;
  loanTenure: number;
  startMonth: number;
  startYear: number;
}

export const exportDetailedPDFReport = (
  schedule: ScheduleRow[], 
  emi: number, 
  totalInterest: number, 
  totalAmount: number, 
  partPayments: any[],
  options: DetailedReportOptions
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const hasVariableEMI = schedule.length > 1 && 
    schedule.some((row, idx) => idx > 0 && Math.abs(row.emiAmount - schedule[idx - 1].emiAmount) > 1);
  const avgEMI = hasVariableEMI ? schedule.reduce((sum, row) => sum + row.emiAmount, 0) / schedule.length : emi;
  const totalPartPayments = schedule.reduce((sum, row) => sum + row.partPayment, 0);
  const principal = totalAmount - totalInterest;
  
  // Helper function for centered text
  const centerText = (text: string, y: number, fontSize: number = 12) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  // ============ PAGE 1: Cover & Summary ============
  // Header with gradient effect (simulated with rectangles)
  doc.setFillColor(34, 139, 34); // Forest green
  doc.rect(0, 0, pageWidth, 45, 'F');
  doc.setFillColor(22, 163, 74); // Lighter green
  doc.rect(0, 35, pageWidth, 15, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  centerText('EMI LOAN REPORT', 25, 24);
  doc.setFontSize(12);
  centerText('Comprehensive Loan Analysis & Schedule', 38, 12);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Report metadata
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const today = new Date();
  doc.text(`Generated on: ${today.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, 60);
  
  // Loan Details Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 70, pageWidth - 28, 50, 3, 3, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(14, 70, pageWidth - 28, 50, 3, 3, 'S');
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Loan Details', 20, 82);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const loanDetailsY = 92;
  doc.text(`Loan Amount: ${formatCurrencyForPDF(options.loanAmount)}`, 20, loanDetailsY);
  doc.text(`Interest Rate: ${options.interestRate}% per annum`, 20, loanDetailsY + 8);
  doc.text(`Loan Tenure: ${options.loanTenure} months (${(options.loanTenure / 12).toFixed(1)} years)`, 20, loanDetailsY + 16);
  
  doc.text(`Start Date: ${getMonthName(options.startMonth)} ${options.startYear}`, 110, loanDetailsY);
  const endMonth = schedule[schedule.length - 1];
  doc.text(`End Date: ${getMonthName(endMonth.month)} ${endMonth.year}`, 110, loanDetailsY + 8);
  doc.text(`Total Months: ${schedule.length}`, 110, loanDetailsY + 16);
  
  // Summary Cards
  const cardY = 130;
  const cardWidth = (pageWidth - 42) / 3;
  const cardHeight = 35;
  
  // Card 1: Monthly EMI
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(14, cardY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(9);
  doc.text(hasVariableEMI ? 'Avg. Monthly EMI' : 'Monthly EMI', 14 + cardWidth/2 - doc.getTextWidth(hasVariableEMI ? 'Avg. Monthly EMI' : 'Monthly EMI')/2, cardY + 12);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const emiText = formatCurrencyForPDF(hasVariableEMI ? avgEMI : emi);
  doc.text(emiText, 14 + cardWidth/2 - doc.getTextWidth(emiText)/2, cardY + 26);
  
  // Card 2: Total Interest
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(21 + cardWidth, cardY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setTextColor(185, 28, 28);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const intLabel = 'Total Interest';
  doc.text(intLabel, 21 + cardWidth + cardWidth/2 - doc.getTextWidth(intLabel)/2, cardY + 12);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const intText = formatCurrencyForPDF(totalInterest);
  doc.text(intText, 21 + cardWidth + cardWidth/2 - doc.getTextWidth(intText)/2, cardY + 26);
  
  // Card 3: Total Amount
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(28 + 2*cardWidth, cardY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setTextColor(22, 101, 52);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const totalLabel = 'Total Payment';
  doc.text(totalLabel, 28 + 2*cardWidth + cardWidth/2 - doc.getTextWidth(totalLabel)/2, cardY + 12);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const totalText = formatCurrencyForPDF(totalAmount);
  doc.text(totalText, 28 + 2*cardWidth + cardWidth/2 - doc.getTextWidth(totalText)/2, cardY + 26);
  
  // Payment Breakdown Chart (simulated with bars)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Payment Breakdown', 14, 185);
  
  const chartY = 195;
  const chartHeight = 20;
  const chartWidth = pageWidth - 28;
  
  const principalRatio = principal / totalAmount;
  const interestRatio = totalInterest / totalAmount;
  const partPaymentRatio = totalPartPayments / totalAmount;
  
  // Background
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(14, chartY, chartWidth, chartHeight, 2, 2, 'F');
  
  // Principal bar (green)
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(14, chartY, chartWidth * principalRatio, chartHeight, 2, 2, 'F');
  
  // Interest bar (red) - positioned after principal
  doc.setFillColor(239, 68, 68);
  doc.rect(14 + chartWidth * principalRatio, chartY, chartWidth * interestRatio, chartHeight, 'F');
  
  // Legend
  const legendY = chartY + 30;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.setFillColor(34, 197, 94);
  doc.rect(14, legendY, 10, 6, 'F');
  doc.setTextColor(0, 0, 0);
  doc.text(`Principal: ${formatCurrencyForPDF(principal)} (${(principalRatio * 100).toFixed(1)}%)`, 28, legendY + 5);
  
  doc.setFillColor(239, 68, 68);
  doc.rect(110, legendY, 10, 6, 'F');
  doc.text(`Interest: ${formatCurrencyForPDF(totalInterest)} (${(interestRatio * 100).toFixed(1)}%)`, 124, legendY + 5);
  
  // Part Payments Section (if any)
  if (partPayments.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Part Payments Summary', 14, 250);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Part Payments: ${formatCurrencyForPDF(totalPartPayments)}`, 14, 260);
    doc.text(`Number of Part Payments: ${partPayments.length}`, 14, 268);
    
    // Part payments table
    const ppTableData = partPayments.map((pp, i) => [
      i + 1,
      `${getMonthName(pp.month)} ${pp.year}`,
      formatCurrencyForPDF(pp.amount),
      pp.strategy === 'reduce-tenure' ? 'Reduce Tenure' : 'Reduce EMI'
    ]);
    
    autoTable(doc, {
      startY: 275,
      head: [['#', 'Date', 'Amount', 'Strategy']],
      body: ppTableData,
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [34, 139, 34] },
      margin: { left: 14, right: 14 },
    });
  }

  // ============ PAGE 2: Yearly Summary ============
  doc.addPage();
  
  // Header
  doc.setFillColor(34, 139, 34);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  centerText('Yearly Summary', 17, 16);
  
  // Group by year
  const yearlyData: { [key: number]: { principal: number; interest: number; partPayment: number; endBalance: number } } = {};
  schedule.forEach(row => {
    if (!yearlyData[row.year]) {
      yearlyData[row.year] = { principal: 0, interest: 0, partPayment: 0, endBalance: 0 };
    }
    yearlyData[row.year].principal += row.principalAmount;
    yearlyData[row.year].interest += row.interestAmount;
    yearlyData[row.year].partPayment += row.partPayment;
    yearlyData[row.year].endBalance = row.remainingBalance;
  });
  
  const yearlyTableData = Object.entries(yearlyData).map(([year, data]) => [
    year,
    formatCurrencyForPDF(data.principal),
    formatCurrencyForPDF(data.interest),
    data.partPayment > 0 ? formatCurrencyForPDF(data.partPayment) : '-',
    formatCurrencyForPDF(data.endBalance),
    `${(((principal - data.endBalance) / principal) * 100).toFixed(1)}%`
  ]);
  
  autoTable(doc, {
    startY: 35,
    head: [['Year', 'Principal', 'Interest', 'Part Payment', 'End Balance', 'Loan Paid']],
    body: yearlyTableData,
    theme: 'grid',
    styles: { fontSize: 9, halign: 'center' },
    headStyles: { fillColor: [34, 139, 34] },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold' },
      5: { halign: 'center' }
    },
    margin: { left: 14, right: 14 },
  });

  // ============ PAGE 3+: Detailed Schedule ============
  doc.addPage();
  
  // Header
  doc.setFillColor(34, 139, 34);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  centerText('Detailed EMI Schedule', 17, 16);
  
  const tableData = schedule.map((row, index) => [
    index + 1,
    `${getMonthName(row.month).substring(0, 3)} ${row.year}`,
    formatCurrencyForPDF(row.emiAmount),
    formatCurrencyForPDF(row.principalAmount),
    formatCurrencyForPDF(row.interestAmount),
    row.partPayment > 0 ? formatCurrencyForPDF(row.partPayment) : '-',
    formatCurrencyForPDF(row.remainingBalance),
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['#', 'Month', 'EMI', 'Principal', 'Interest', 'Part Pay', 'Balance']],
    body: tableData,
    theme: 'striped',
    styles: { fontSize: 8, halign: 'center' },
    headStyles: { fillColor: [34, 139, 34] },
    columnStyles: {
      0: { halign: 'center' },
      1: { halign: 'left' },
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => {
      // Add header on each new page
      if (data.pageNumber > 1) {
        doc.setFillColor(34, 139, 34);
        doc.rect(0, 0, pageWidth, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        centerText('EMI Schedule (continued)', 10, 10);
      }
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - 25, pageHeight - 10);
    }
  });

  // Save
  doc.save('EMI_Detailed_Report.pdf');
};
