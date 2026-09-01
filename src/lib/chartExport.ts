import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';

interface ChartDataset {
  label: string;
  data: number[];
  color?: string;
}

interface ChartExportData {
  chartType: string;
  title: string;
  labels: string[];
  datasets: ChartDataset[];
}

/**
 * Capture a DOM element as PNG and export chart data + image as an Excel file.
 */
export async function exportChartToExcel(
  data: ChartExportData,
  chartElement: HTMLElement | null,
  filename?: string
): Promise<void> {
  if (!chartElement) {
    throw new Error('Chart element not found');
  }

  // 1. Capture chart as PNG
  const pngDataUrl = await toPng(chartElement, {
    backgroundColor: '#0f172a', // slate-900
    pixelRatio: 2,
    cacheBust: true,
  });

  const base64 = pngDataUrl.replace(/^data:image\/png;base64,/, '');
  const imageBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  // 2. Build workbook
  // Loaded on demand: this is ~416 kB that only matters when the user
  // actually exports. A static import puts it in the initial bundle for
  // everyone, including the majority who never click Export.
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  // --- Data Sheet ---
  const dataSheet = workbook.addWorksheet('Data');

  // Header row
  const header = ['Label', ...data.datasets.map(ds => ds.label)];
  dataSheet.addRow(header);

  // Data rows
  data.labels.forEach((label, i) => {
    const row = [label, ...data.datasets.map(ds => ds.data[i] ?? 0)];
    dataSheet.addRow(row);
  });

  // Style header
  dataSheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
    cell.alignment = { horizontal: 'center' };
  });

  // Auto-width
  dataSheet.columns.forEach(col => {
    let max = 10;
    col.eachCell?.((cell) => {
      const len = String(cell.value).length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 4, 40);
  });

  // --- Chart Sheet ---
  const chartSheet = workbook.addWorksheet('Chart');

  const imageId = workbook.addImage({
    buffer: imageBuffer as any,
    extension: 'png',
  });

  chartSheet.addImage(imageId, {
    tl: { col: 0.5, row: 1.5 },
    ext: { width: 640, height: 360 },
  });

  chartSheet.getCell('A1').value = data.title;
  chartSheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF1E293B' } };

  // 3. Download
  const blob = await workbook.xlsx.writeBuffer();
  const safeFilename = (filename || data.title || 'chart-export').replace(/[^a-z0-9]/gi, '_');
  saveAs(new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${safeFilename}.xlsx`);
}
