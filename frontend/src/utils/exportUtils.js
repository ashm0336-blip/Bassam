import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
applyPlugin(jsPDF);
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Arabic font support - using built-in fonts with RTL support
const setupArabicFont = (doc) => {
  doc.setFont('helvetica');
  doc.setR2L(true);
};

// Export to PDF
export const exportToPDF = (data, title, columns, filename = 'report') => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Title
  doc.setFontSize(18);
  doc.text(title, doc.internal.pageSize.width / 2, 20, { align: 'center' });
  
  // Date
  doc.setFontSize(10);
  const date = new Date().toLocaleDateString('ar-SA');
  doc.text(`التاريخ: ${date}`, doc.internal.pageSize.width - 20, 30, { align: 'right' });

  // Table
  doc.autoTable({
    head: [columns.map(col => col.header)],
    body: data.map(row => columns.map(col => row[col.key] ?? '')),
    startY: 40,
    styles: {
      font: 'helvetica',
      halign: 'right',
      fontSize: 10,
    },
    headStyles: {
      fillColor: [0, 77, 56], // Primary green
      textColor: 255,
      halign: 'right',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 240],
    },
    margin: { top: 40, right: 10, bottom: 20, left: 10 },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `صفحة ${i} من ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
    doc.text(
      'منصة خدمات الحشود - Al-Haram OS',
      20,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`${filename}.pdf`);
};

// Export to Excel
export const exportToExcel = (data, title, columns, filename = 'report') => {
  // Prepare data with headers
  const headers = columns.map(col => col.header);
  const rows = data.map(row => columns.map(col => row[col.key] ?? ''));
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([
    [title], // Title row
    [], // Empty row
    headers, // Headers
    ...rows // Data
  ]);

  // Style the title
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } }];
  
  // Set column widths
  ws['!cols'] = columns.map(() => ({ wch: 20 }));

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'التقرير');

  // Generate buffer
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(blob, `${filename}.xlsx`);
};

// Export gates report
export const exportGatesReport = (gates, format = 'pdf') => {
  const columns = [
    { key: 'number', header: 'رقم الباب' },
    { key: 'name', header: 'الاسم' },
    { key: 'status', header: 'الحالة' },
    { key: 'direction', header: 'الاتجاه' },
    { key: 'current_flow', header: 'التدفق الحالي' },
    { key: 'max_flow', header: 'الطاقة القصوى' },
    { key: 'location', header: 'الموقع' },
  ];

  const data = gates.map(gate => ({
    ...gate,
    status: gate.status === 'open' ? 'مفتوح' : gate.status === 'closed' ? 'مغلق' : 'صيانة',
    direction: gate.direction === 'entry' ? 'دخول' : gate.direction === 'exit' ? 'خروج' : 'دخول/خروج',
    current_flow: gate.current_flow?.toLocaleString('ar-SA') || '0',
    max_flow: gate.max_flow?.toLocaleString('ar-SA') || '0',
  }));

  const filename = `gates_report_${new Date().toISOString().split('T')[0]}`;
  
  if (format === 'pdf') {
    exportToPDF(data, 'تقرير الأبواب', columns, filename);
  } else {
    exportToExcel(data, 'تقرير الأبواب', columns, filename);
  }
};

// Export plazas report
export const exportPlazasReport = (plazas, format = 'pdf') => {
  const columns = [
    { key: 'name', header: 'الاسم' },
    { key: 'zone', header: 'المنطقة' },
    { key: 'current_crowd', header: 'الحشود الحالية' },
    { key: 'max_capacity', header: 'الطاقة القصوى' },
    { key: 'percentage', header: 'نسبة الإشغال' },
    { key: 'status', header: 'الحالة' },
  ];

  const zoneNames = {
    north: 'شمال',
    south: 'جنوب',
    east: 'شرق',
    west: 'غرب',
    masa: 'المسعى',
    ajyad: 'أجياد'
  };

  const data = plazas.map(plaza => ({
    ...plaza,
    zone: zoneNames[plaza.zone] || plaza.zone,
    current_crowd: plaza.current_crowd?.toLocaleString('ar-SA') || '0',
    max_capacity: plaza.max_capacity?.toLocaleString('ar-SA') || '0',
    percentage: `${plaza.percentage}%`,
    status: plaza.status === 'normal' ? 'طبيعي' : plaza.status === 'warning' ? 'مرتفع' : 'حرج',
  }));

  const filename = `plazas_report_${new Date().toISOString().split('T')[0]}`;
  
  if (format === 'pdf') {
    exportToPDF(data, 'تقرير الساحات', columns, filename);
  } else {
    exportToExcel(data, 'تقرير الساحات', columns, filename);
  }
};

// Export mataf report
export const exportMatafReport = (mataf, format = 'pdf') => {
  const columns = [
    { key: 'level', header: 'الطابق' },
    { key: 'current_crowd', header: 'الحشود الحالية' },
    { key: 'max_capacity', header: 'الطاقة القصوى' },
    { key: 'percentage', header: 'نسبة الإشغال' },
    { key: 'average_tawaf_time', header: 'متوسط الطواف' },
    { key: 'status', header: 'الحالة' },
  ];

  const data = mataf.map(level => ({
    ...level,
    current_crowd: level.current_crowd?.toLocaleString('ar-SA') || '0',
    max_capacity: level.max_capacity?.toLocaleString('ar-SA') || '0',
    percentage: `${level.percentage}%`,
    average_tawaf_time: `${level.average_tawaf_time} دقيقة`,
    status: level.status === 'normal' ? 'طبيعي' : level.status === 'warning' ? 'مرتفع' : 'حرج',
  }));

  const filename = `mataf_report_${new Date().toISOString().split('T')[0]}`;
  
  if (format === 'pdf') {
    exportToPDF(data, 'تقرير صحن المطاف', columns, filename);
  } else {
    exportToExcel(data, 'تقرير صحن المطاف', columns, filename);
  }
};

// Export daily summary report
export const exportDailySummary = (stats, departments, format = 'pdf') => {
  const columns = [
    { key: 'metric', header: 'المؤشر' },
    { key: 'value', header: 'القيمة' },
  ];

  const data = [
    { metric: 'إجمالي الزوار اليوم', value: stats.total_visitors_today?.toLocaleString('ar-SA') || '0' },
    { metric: 'الحشود الحالية', value: stats.current_crowd?.toLocaleString('ar-SA') || '0' },
    { metric: 'الطاقة الاستيعابية', value: stats.max_capacity?.toLocaleString('ar-SA') || '0' },
    { metric: 'الأبواب المفتوحة', value: `${stats.open_gates || 0} / ${stats.total_gates || 0}` },
    { metric: 'التنبيهات النشطة', value: stats.alerts_count || '0' },
    { metric: 'الحوادث اليوم', value: stats.incidents_today || '0' },
    { metric: '', value: '' },
    { metric: '--- حالة الإدارات ---', value: '' },
    ...departments.map(dept => ({
      metric: dept.name,
      value: `${dept.percentage}% (${dept.status === 'normal' ? 'طبيعي' : dept.status === 'warning' ? 'مرتفع' : 'حرج'})`
    }))
  ];

  const filename = `daily_summary_${new Date().toISOString().split('T')[0]}`;
  
  if (format === 'pdf') {
    exportToPDF(data, 'التقرير اليومي الشامل', columns, filename);
  } else {
    exportToExcel(data, 'التقرير اليومي الشامل', columns, filename);
  }
};

export default {
  exportToPDF,
  exportToExcel,
  exportGatesReport,
  exportPlazasReport,
  exportMatafReport,
  exportDailySummary,
};
