export interface MaterialImportResult {
  added: number;
  updated: number;
  total: number;
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  fields.push(current);
  return fields;
}

function parseCsvContent(content: string): string[][] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(current);
      current = '';
    } else if (ch === '\n') {
      row.push(current);
      current = '';
      if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
      }
      row = [];
    } else {
      current += ch;
    }
  }

  row.push(current);
  if (row.some((cell) => cell.trim() !== '')) {
    rows.push(row);
  }

  return rows;
}

function isHeaderRow(firstCell: string): boolean {
  const normalized = firstCell.trim().toLowerCase();
  return (
    normalized === 'material code' ||
    firstCell.trim() === 'รหัส Material' ||
    normalized === 'material_code'
  );
}

export function buildMaterialsCsv(
  rows: Array<{ materialCode: string; description: string | null }>,
  lang: 'th' | 'en' = 'en',
): string {
  const header =
    lang === 'th'
      ? ['รหัส Material', 'รายละเอียด']
      : ['Material Code', 'Description'];

  const lines = [
    header.map(escapeCsvField).join(','),
    ...rows.map((row) =>
      [
        escapeCsvField(row.materialCode),
        escapeCsvField(row.description?.trim() ? row.description : '-'),
      ].join(','),
    ),
  ];

  return lines.join('\n');
}

export function parseMaterialsCsv(buffer: Buffer): Array<{
  materialCode: string;
  description: string;
}> {
  let text = buffer.toString('utf-8');
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const rows = parseCsvContent(text);
  const items: Array<{ materialCode: string; description: string }> = [];

  rows.forEach((cells, index) => {
    const materialCode = (cells[0] ?? '').trim();
    const description = (cells[1] ?? '').trim();

    if (index === 0 && isHeaderRow(cells[0] ?? '')) {
      return;
    }

    if (!materialCode) {
      return;
    }

    items.push({ materialCode, description });
  });

  return items;
}

export { parseCsvRow };
