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

  const exportCsv = useCallback(
    (rows: Record<string, unknown>[], filename: string) => {
      if (rows.length === 0) return;
      const headers = Object.keys(rows[0]);
      const escape = (value: unknown) => {
        const text = value == null ? '' : String(value);
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      };
      const lines = [
        headers.join(','),
        ...rows.map((row) => headers.map((key) => escape(row[key])).join(',')),
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    },
    [],
  );

  return { exportExcel, exportPdf, exportCsv };
}
