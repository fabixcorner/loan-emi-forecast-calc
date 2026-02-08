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
  doc.setFontSize(14);
  doc.text('EMI Schedule', 14, 16);
  
  // Summary information - compact single line
  doc.setFontSize(9);
  doc.text(`${hasVariableEMI ? 'Avg. ' : ''}EMI: ${formatCurrencyForPDF(hasVariableEMI ? avgEMI : emi)}  |  Total: ${formatCurrencyForPDF(totalAmount)}  |  Interest: ${formatCurrencyForPDF(totalInterest)}`, 14, 24);
  if (hasVariableEMI) {
    doc.setFontSize(7);
    doc.text('Note: EMI amounts vary due to part payment strategies', 14, 28);
  }
  
  // Table data
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
    startY: hasVariableEMI ? 31 : 28,
    head: [['#', 'Month', 'EMI', 'Principal', 'Interest', 'Part Pay', 'Balance']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [66, 139, 202], halign: 'center', cellPadding: 2 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'center', cellWidth: 24 },
      3: { halign: 'center', cellWidth: 24 },
      4: { halign: 'center', cellWidth: 24 },
      5: { halign: 'center', cellWidth: 24 },
      6: { halign: 'center', cellWidth: 28 },
    },
    margin: { left: 10, right: 10 },
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

interface AffordabilityData {
  grossIncome: number;
  tenure: number;
  interestRate: number;
  otherEMIs: number;
  hasCreditScore: boolean;
  creditScore: number;
  employmentType: string;
  propertyValue: number;
  eligibleAmount: number;
  maxEMI: number;
  ltvLimit: number;
}

export const exportAffordabilityPDF = (data: AffordabilityData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const centerText = (text: string, y: number, fontSize: number = 12) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  // Header
  doc.setFillColor(34, 139, 34);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 32, pageWidth, 12, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  centerText('LOAN AFFORDABILITY REPORT', 22, 22);
  doc.setFontSize(11);
  centerText('Eligibility Analysis & Summary', 36, 11);
  
  doc.setTextColor(0, 0, 0);
  
  // Report date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const today = new Date();
  doc.text(`Generated on: ${today.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, 55);
  
  // Eligible Amount Box
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, 65, pageWidth - 28, 45, 4, 4, 'F');
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, 65, pageWidth - 28, 45, 4, 4, 'S');
  
  doc.setTextColor(22, 101, 52);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  centerText('You are eligible for a loan up to', 80, 12);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  centerText(formatCurrencyForPDF(data.eligibleAmount), 98, 28);
  
  // Input Parameters Section
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Input Parameters', 14, 125);
  
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 130, pageWidth - 28, 60, 3, 3, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(14, 130, pageWidth - 28, 60, 3, 3, 'S');
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const col1X = 20;
  const col2X = 110;
  let rowY = 142;
  const rowHeight = 10;
  
  doc.text(`Gross Monthly Income:`, col1X, rowY);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrencyForPDF(data.grossIncome), col1X + 50, rowY);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Property Value:`, col2X, rowY);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrencyForPDF(data.propertyValue), col2X + 40, rowY);
  
  rowY += rowHeight;
  doc.setFont('helvetica', 'normal');
  doc.text(`Loan Tenure:`, col1X, rowY);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.tenure} years (${data.tenure * 12} months)`, col1X + 50, rowY);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Interest Rate:`, col2X, rowY);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.interestRate}% p.a.`, col2X + 40, rowY);
  
  rowY += rowHeight;
  doc.setFont('helvetica', 'normal');
  doc.text(`Other EMIs:`, col1X, rowY);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrencyForPDF(data.otherEMIs), col1X + 50, rowY);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Employment Type:`, col2X, rowY);
  doc.setFont('helvetica', 'bold');
  const empLabel = data.employmentType === 'salaried' ? 'Salaried' : data.employmentType === 'self-employed' ? 'Self-Employed' : 'Business Owner';
  doc.text(empLabel, col2X + 40, rowY);
  
  rowY += rowHeight;
  doc.setFont('helvetica', 'normal');
  doc.text(`Credit Score:`, col1X, rowY);
  doc.setFont('helvetica', 'bold');
  doc.text(data.hasCreditScore ? `${data.creditScore}` : 'Not provided', col1X + 50, rowY);
  
  // Calculation Breakdown Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Eligibility Breakdown', 14, 205);
  
  const breakdownData = [
    ['Max Allowed EMI (50% FOIR)', formatCurrencyForPDF(data.grossIncome * 0.5)],
    ['Existing EMI Obligations', formatCurrencyForPDF(data.otherEMIs)],
    ['Available for New EMI', formatCurrencyForPDF(data.maxEMI)],
    ['LTV Limit (' + (data.hasCreditScore && data.creditScore >= 750 ? '85%' : '75%') + ' of property)', formatCurrencyForPDF(data.ltvLimit)],
    ['Employment Factor', (data.employmentType === 'salaried' ? '100%' : data.employmentType === 'business-owner' ? '90%' : '85%')],
  ];
  
  if (data.hasCreditScore) {
    const creditMultiplier = data.creditScore >= 800 ? 110 : data.creditScore >= 750 ? 100 : data.creditScore >= 700 ? 90 : data.creditScore >= 650 ? 80 : 70;
    breakdownData.push(['Credit Score Multiplier', `${creditMultiplier}%`]);
  }
  
  autoTable(doc, {
    startY: 210,
    head: [['Factor', 'Value']],
    body: breakdownData,
    theme: 'striped',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [34, 139, 34] },
    columnStyles: {
      0: { fontStyle: 'normal' },
      1: { fontStyle: 'bold', halign: 'right' }
    },
    margin: { left: 14, right: 14 },
  });
  
  // Assumptions
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(14, finalY, pageWidth - 28, 35, 3, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(146, 64, 14);
  doc.text('Assumptions & Disclaimer', 20, finalY + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 53, 15);
  doc.text('• This is an indicative eligibility. Actual loan approval depends on bank policies and document verification.', 20, finalY + 18);
  doc.text('• Processing fees, insurance, and other charges are not included in this calculation.', 20, finalY + 24);
  doc.text('• LTV and FOIR ratios may vary based on lender and loan type.', 20, finalY + 30);
  
  doc.save('Loan_Affordability_Report.pdf');
};

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
  
  const centerText = (text: string, y: number, fontSize: number = 12) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  // ============ PAGE 1: Cover & Summary ============
  // Compact header
  doc.setFillColor(34, 139, 34);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 24, pageWidth, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  centerText('EMI LOAN REPORT', 18, 18);
  doc.setFontSize(9);
  centerText('Comprehensive Loan Analysis & Schedule', 28, 9);
  
  doc.setTextColor(0, 0, 0);
  
  // Report date
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const today = new Date();
  doc.text(`Generated: ${today.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, 42);
  
  // Loan Details Box - compact
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 47, pageWidth - 28, 32, 3, 3, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(14, 47, pageWidth - 28, 32, 3, 3, 'S');
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Loan Details', 20, 56);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const loanDetailsY = 63;
  doc.text(`Amount: ${formatCurrencyForPDF(options.loanAmount)}`, 20, loanDetailsY);
  doc.text(`Rate: ${options.interestRate}% p.a.`, 20, loanDetailsY + 6);
  doc.text(`Tenure: ${options.loanTenure} months (${(options.loanTenure / 12).toFixed(1)} yrs)`, 20, loanDetailsY + 12);
  
  const endMonth = schedule[schedule.length - 1];
  doc.text(`Start: ${getMonthName(options.startMonth)} ${options.startYear}`, 110, loanDetailsY);
  doc.text(`End: ${getMonthName(endMonth.month)} ${endMonth.year}`, 110, loanDetailsY + 6);
  doc.text(`Total Months: ${schedule.length}`, 110, loanDetailsY + 12);
  
  // Summary Cards - compact
  const cardY = 85;
  const cardWidth = (pageWidth - 42) / 3;
  const cardHeight = 25;
  
  // Card 1: Monthly EMI
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(14, cardY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(7);
  const emiLabel = hasVariableEMI ? 'Avg. Monthly EMI' : 'Monthly EMI';
  doc.text(emiLabel, 14 + cardWidth/2 - doc.getTextWidth(emiLabel)/2, cardY + 9);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const emiText = formatCurrencyForPDF(hasVariableEMI ? avgEMI : emi);
  doc.text(emiText, 14 + cardWidth/2 - doc.getTextWidth(emiText)/2, cardY + 19);
  
  // Card 2: Total Interest
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(21 + cardWidth, cardY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setTextColor(185, 28, 28);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const intLabel = 'Total Interest';
  doc.text(intLabel, 21 + cardWidth + cardWidth/2 - doc.getTextWidth(intLabel)/2, cardY + 9);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const intText = formatCurrencyForPDF(totalInterest);
  doc.text(intText, 21 + cardWidth + cardWidth/2 - doc.getTextWidth(intText)/2, cardY + 19);
  
  // Card 3: Total Amount
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(28 + 2*cardWidth, cardY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setTextColor(22, 101, 52);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const totalLabel = 'Total Payment';
  doc.text(totalLabel, 28 + 2*cardWidth + cardWidth/2 - doc.getTextWidth(totalLabel)/2, cardY + 9);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const totalText = formatCurrencyForPDF(totalAmount);
  doc.text(totalText, 28 + 2*cardWidth + cardWidth/2 - doc.getTextWidth(totalText)/2, cardY + 19);
  
  // Payment Breakdown Bar - compact
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Payment Breakdown', 14, 120);
  
  const chartY = 125;
  const chartHeight = 14;
  const chartWidth = pageWidth - 28;
  
  const principalRatio = principal / totalAmount;
  const interestRatio = totalInterest / totalAmount;
  
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(14, chartY, chartWidth, chartHeight, 2, 2, 'F');
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(14, chartY, chartWidth * principalRatio, chartHeight, 2, 2, 'F');
  doc.setFillColor(239, 68, 68);
  doc.rect(14 + chartWidth * principalRatio, chartY, chartWidth * interestRatio, chartHeight, 'F');
  
  // Legend - single line
  const legendY = chartY + 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setFillColor(34, 197, 94);
  doc.rect(14, legendY, 8, 4, 'F');
  doc.setTextColor(0, 0, 0);
  doc.text(`Principal: ${formatCurrencyForPDF(principal)} (${(principalRatio * 100).toFixed(1)}%)`, 24, legendY + 4);
  doc.setFillColor(239, 68, 68);
  doc.rect(110, legendY, 8, 4, 'F');
  doc.text(`Interest: ${formatCurrencyForPDF(totalInterest)} (${(interestRatio * 100).toFixed(1)}%)`, 120, legendY + 4);

  // ============ Yearly Chart Visualization ============
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

  const years = Object.keys(yearlyData).map(Number).sort((a, b) => a - b);
  const maxPayment = Math.max(...years.map(y => yearlyData[y].principal + yearlyData[y].interest + yearlyData[y].partPayment));
  
  let barChartY = legendY + 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Yearly Payments & Balance', 14, barChartY);
  barChartY += 6;

  const barAreaWidth = pageWidth - 50;
  const barHeight = 6;
  const barGap = 3;
  const maxBarsPerPage = Math.floor((pageHeight - barChartY - 30) / (barHeight + barGap));
  const yearsToShow = years.slice(0, Math.min(years.length, maxBarsPerPage));

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  
  yearsToShow.forEach((year, i) => {
    const y = barChartY + i * (barHeight + barGap);
    const data = yearlyData[year];
    const total = data.principal + data.interest + data.partPayment;
    const pW = (data.principal / maxPayment) * barAreaWidth;
    const iW = (data.interest / maxPayment) * barAreaWidth;
    const ppW = (data.partPayment / maxPayment) * barAreaWidth;

    doc.setTextColor(80, 80, 80);
    doc.text(`${year}`, 14, y + barHeight - 1);

    doc.setFillColor(34, 197, 94);
    doc.rect(32, y, pW, barHeight, 'F');
    doc.setFillColor(239, 68, 68);
    doc.rect(32 + pW, y, iW, barHeight, 'F');
    if (ppW > 0) {
      doc.setFillColor(34, 139, 34);
      doc.rect(32 + pW + iW, y, ppW, barHeight, 'F');
    }

    doc.setTextColor(120, 120, 120);
    doc.text(`Bal: ${formatCurrencyForPDF(data.endBalance)}`, 32 + pW + iW + ppW + 2, y + barHeight - 1);
  });

  // Part Payments Section (if any) - compact
  if (partPayments.length > 0) {
    let ppY = barChartY + yearsToShow.length * (barHeight + barGap) + 8;
    
    // Check if we need a new page
    if (ppY + 40 > pageHeight - 20) {
      doc.addPage();
      ppY = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Part Payments', 14, ppY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Total: ${formatCurrencyForPDF(totalPartPayments)} | Count: ${partPayments.length}`, 14, ppY + 7);
    
    const ppTableData = partPayments.map((pp, i) => [
      i + 1,
      `${getMonthName(pp.month).substring(0, 3)} ${pp.year}`,
      formatCurrencyForPDF(pp.amount),
      pp.strategy === 'reduce-tenure' ? 'Reduce Tenure' : 'Reduce EMI'
    ]);
    
    autoTable(doc, {
      startY: ppY + 10,
      head: [['#', 'Date', 'Amount', 'Strategy']],
      body: ppTableData,
      theme: 'striped',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [34, 139, 34], halign: 'center', cellPadding: 2 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'center', cellWidth: 35 },
        3: { halign: 'center', cellWidth: 30 },
      },
      margin: { left: 14, right: 14 },
    });
  }

  // ============ PAGE 2: Yearly Summary ============
  doc.addPage();
  
  doc.setFillColor(34, 139, 34);
  doc.rect(0, 0, pageWidth, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  centerText('Yearly Summary', 13, 12);
  
  const yearlyTableData = Object.entries(yearlyData).map(([year, data]) => [
    year,
    formatCurrencyForPDF(data.principal),
    formatCurrencyForPDF(data.interest),
    data.partPayment > 0 ? formatCurrencyForPDF(data.partPayment) : '-',
    formatCurrencyForPDF(data.endBalance),
    `${(((principal - data.endBalance) / principal) * 100).toFixed(1)}%`
  ]);
  
  autoTable(doc, {
    startY: 24,
    head: [['Year', 'Principal', 'Interest', 'Part Pay', 'Balance', 'Paid']],
    body: yearlyTableData,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [34, 139, 34], halign: 'center', cellPadding: 2 },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
      1: { halign: 'center', cellWidth: 28 },
      2: { halign: 'center', cellWidth: 28 },
      3: { halign: 'center', cellWidth: 28 },
      4: { halign: 'center', cellWidth: 28 },
      5: { halign: 'center', cellWidth: 20 }
    },
    margin: { left: 14, right: 14 },
  });

  // ============ PAGE 3+: Detailed Schedule ============
  doc.addPage();
  
  doc.setFillColor(34, 139, 34);
  doc.rect(0, 0, pageWidth, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  centerText('Detailed EMI Schedule', 13, 12);
  
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
    startY: 24,
    head: [['#', 'Month', 'EMI', 'Principal', 'Interest', 'Part Pay', 'Balance']],
    body: tableData,
    theme: 'striped',
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [34, 139, 34], halign: 'center', cellPadding: 2 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'center', cellWidth: 26 },
      4: { halign: 'center', cellWidth: 26 },
      5: { halign: 'center', cellWidth: 26 },
      6: { halign: 'center', cellWidth: 30 },
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFillColor(34, 139, 34);
        doc.rect(0, 0, pageWidth, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        centerText('EMI Schedule (continued)', 8, 8);
      }
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - 22, pageHeight - 8);
    }
  });

  doc.save('EMI_Detailed_Report.pdf');
};
