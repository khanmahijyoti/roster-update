import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface WorkerStat {
  worker_id: string;
  worker_name: string;
  worker_email: string;
  total_hours: number;
  shift_count: number;
  shifts: Array<{
    date: string;
    start_time: string;
    end_time: string;
    hours: number;
    restaurant_name: string;
  }>;
}

interface ReportSummary {
  restaurant_name: string;
  week_start: string;
  week_end: string;
  total_shifts: number;
  total_workers: number;
  worker_stats: WorkerStat[];
  generated_at: string;
}

interface Report {
  id: string;
  restaurant_id: string;
  week_start_date: string;
  week_end_date: string;
  summary_data: ReportSummary;
  total_hours: number;
  created_at: string;
}

export function exportReportToPDF(report: Report) {
  const doc = new jsPDF();
  const summary = report.summary_data;
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(139, 92, 246); // Primary purple color
  doc.text('Weekly Roster Report', 14, 20);
  
  // Restaurant name and date range
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(summary.restaurant_name, 14, 30);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const weekStart = formatDate(report.week_start_date);
  const weekEnd = formatDate(report.week_end_date);
  doc.text(`Week: ${weekStart} - ${weekEnd}`, 14, 37);
  
  // Summary statistics
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Summary', 14, 47);
  
  const summaryData = [
    ['Total Hours', `${report.total_hours.toFixed(1)} hours`],
    ['Total Workers', summary.total_workers.toString()],
    ['Total Shifts', summary.total_shifts.toString()],
    ['Average Hours per Worker', summary.total_workers > 0 
      ? `${(report.total_hours / summary.total_workers).toFixed(1)} hours` 
      : '0 hours'],
  ];
  
  autoTable(doc, {
    startY: 50,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: [139, 92, 246] }, // Primary purple
    margin: { left: 14 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 'auto' },
    },
  });
  
  // Worker breakdown table
  let finalY = (doc as any).lastAutoTable.finalY || 90;
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Worker Breakdown', 14, finalY + 10);
  
  const workerData = summary.worker_stats.map(worker => [
    worker.worker_name,
    worker.worker_email,
    `${worker.total_hours.toFixed(1)} hrs`,
    worker.shift_count.toString(),
  ]);
  
  autoTable(doc, {
    startY: finalY + 13,
    head: [['Worker Name', 'Email', 'Total Hours', 'Shifts']],
    body: workerData,
    theme: 'striped',
    headStyles: { fillColor: [139, 92, 246] },
    margin: { left: 14 },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 60 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
    },
  });
  
  // Add detailed shift information for each worker
  finalY = (doc as any).lastAutoTable.finalY || 150;
  
  summary.worker_stats.forEach((worker, workerIndex) => {
    // Check if we need a new page
    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    }
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`${worker.worker_name} - Shift Details`, 14, finalY + 10);
    
    const shiftData = worker.shifts.map(shift => [
      formatDate(shift.date),
      formatTime(shift.start_time),
      formatTime(shift.end_time),
      `${shift.hours.toFixed(1)} hrs`,
      shift.restaurant_name,
    ]);
    
    autoTable(doc, {
      startY: finalY + 13,
      head: [['Date', 'Start', 'End', 'Hours', 'Restaurant']],
      body: shiftData,
      theme: 'grid',
      headStyles: { fillColor: [139, 92, 246], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 50 },
      },
    });
    
    finalY = (doc as any).lastAutoTable.finalY + 5;
  });
  
  // Footer on last page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated: ${new Date(summary.generated_at).toLocaleString('en-AU')}`,
      14,
      doc.internal.pageSize.height - 10
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width - 30,
      doc.internal.pageSize.height - 10
    );
  }
  
  // Download the PDF
  const filename = `${summary.restaurant_name.replace(/\s+/g, '_')}_Report_${weekStart.replace(/\s+/g, '_')}_to_${weekEnd.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
