import { useCallback } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function useExport() {
  const exportExcel = useCallback(
    (rows: Record<string, unknown>[], filename: string, sheetName = 'Report') => {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, `${filename}.xlsx`);
    },
    [],
  );

  const exportPdf = useCallback(
    (
      title: string,
      columns: string[],
      rows: (string | number)[][],
      filename: string,
    ) => {
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(14);
      doc.text(title, 14, 16);
      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 22,
        styles: { fontSize: 9 },
      });
      doc.save(`${filename}.pdf`);
    },
    [],
  );

  return { exportExcel, exportPdf };
}
