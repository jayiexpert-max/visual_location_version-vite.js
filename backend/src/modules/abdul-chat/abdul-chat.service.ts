import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface AbdulChatResult {
  intent: string;
  param: string;
  data: Record<string, unknown>[];
  count: number;
  sql_debug: string;
  response_ms: number;
  question: string;
}

const INTENT_MAP: Record<string, string[]> = {
  near_expiry: [
    'ใกล้หมดอายุ',
    'ใกล้หมด',
    'expire soon',
    'near expiry',
    'expiring soon',
    'จะหมดอายุ',
    'เกือบหมดอายุ',
  ],
  expired_material: ['หมดอายุ', 'expired', 'หมดแล้ว', 'เลยกำหนด'],
  find_location: [
    'อยู่ไหน',
    'อยู่ที่ไหน',
    'location',
    'where',
    'ตำแหน่ง',
    'เก็บไว้ไหน',
    'วางไว้ไหน',
    'เก็บที่ไหน',
    'หาของ',
    'อยู่ตรงไหน',
  ],
  stock_check: [
    'เหลือ',
    'stock',
    'qty',
    'จำนวน',
    'เหลือเท่าไหร่',
    'คงเหลือ',
    'มีกี่',
    'เช็คสต็อก',
    'check stock',
    'ยอดคงเหลือ',
    'เหลือกี่',
  ],
  find_puid: ['puid'],
  rack_items: ['rack', 'ชั้น', 'ชั้นวาง', 'shelf', 'แร็ค'],
  list_all: [
    'ทั้งหมด',
    'all',
    'รายการทั้งหมด',
    'list all',
    'แสดงทั้งหมด',
    'ขอดูทั้งหมด',
    'รายการ',
    'list',
    'แสดง',
    'ขอดู',
  ],
  search_item: ['ค้นหา', 'search', 'หา', 'ข้อมูล', 'ดู', 'เช็ค', 'check'],
};

@Injectable()
export class AbdulChatService {
  constructor(private readonly dataSource: DataSource) {}

  async ask(question: string): Promise<AbdulChatResult> {
    const trimmed = question.trim();
    if (!trimmed) {
      throw new BadRequestException('กรุณาพิมพ์คำถาม');
    }

    const start = performance.now();
    const intent = this.detectIntent(trimmed);
    const param = this.extractParam(trimmed, intent);
    const result = await this.runIntentQuery(intent, param);
    const elapsed = Math.round((performance.now() - start) * 100) / 100;

    return {
      intent,
      param,
      data: result.data,
      count: result.count,
      sql_debug: result.sql,
      response_ms: elapsed,
      question: trimmed,
    };
  }

  private detectIntent(question: string): string {
    const q = question.toLowerCase();
    for (const [intent, keywords] of Object.entries(INTENT_MAP)) {
      for (const kw of keywords) {
        if (q.includes(kw.toLowerCase())) {
          return intent;
        }
      }
    }
    return 'search_item';
  }

  private extractParam(question: string, intent: string): string {
    const q = question.trim();

    if (intent === 'find_puid') {
      const puidMatch = q.match(/puid\s*[:\s]*([a-zA-Z0-9]+)/i);
      if (puidMatch) return puidMatch[1].toUpperCase();
      const codeMatch = q.match(/\b([a-zA-Z0-9]{6,})\b/i);
      if (codeMatch) return codeMatch[1].toUpperCase();
    }

    if (intent === 'rack_items') {
      const numMatch = q.match(/\b(\d{1,2})\b/);
      if (numMatch) return numMatch[1];
      const shelfMatch = q.match(/ชั้น\s*(\S+)/u);
      if (shelfMatch) return shelfMatch[1];
    }

    if (['find_location', 'stock_check', 'search_item'].includes(intent)) {
      const istMatch = q.match(/\b(\d{3,4}IST\S*)\b/i);
      if (istMatch) return istMatch[1].toUpperCase();

      const codeMatch = q.match(/\b([A-Za-z0-9]{4,}[A-Za-z0-9]*)\b/i);
      if (codeMatch) {
        const code = codeMatch[1];
        const skipWords = ['location', 'where', 'stock', 'check', 'search', 'PUID'];
        if (!skipWords.some((w) => w.toLowerCase() === code.toLowerCase())) {
          return code.toUpperCase();
        }
      }

      const quotedMatch = q.match(/["'](.+?)["']/u);
      if (quotedMatch) return quotedMatch[1].trim();

      const removeWords = [
        'อยู่ไหน',
        'อยู่ที่ไหน',
        'เหลือ',
        'เหลือเท่าไหร่',
        'มีกี่',
        'จำนวน',
        'ค้นหา',
        'หา',
        'ดู',
        'เช็ค',
        'สินค้า',
        'ของ',
        'ข้อมูล',
        'พาร์ท',
        'part',
        'check',
        'stock',
        'เช็คสต็อก',
        'คงเหลือ',
        'เบิก',
        'ยอด',
      ];
      let cleaned = q;
      for (const w of removeWords) {
        cleaned = cleaned.replace(new RegExp(w, 'gi'), '');
      }
      cleaned = cleaned.trim();
      if (cleaned) return cleaned;
    }

    if (['expired_material', 'near_expiry', 'list_all'].includes(intent)) {
      return '';
    }

    return q;
  }

  private async runIntentQuery(
    intent: string,
    param: string,
  ): Promise<{ data: Record<string, unknown>[]; count: number; sql: string }> {
    let sql = '';
    let data: Record<string, unknown>[] = [];

    switch (intent) {
      case 'find_location':
        sql = `SELECT 
                        part_name AS HanaPart,
                        current_qty AS QtyRemain,
                        rack_name AS Shelf,
                        level_no AS Level,
                        box_code AS Box,
                        slot_no AS Slot,
                        earliest_expiration AS ExpirationDate
                    FROM v_inventory_location
                    WHERE part_name LIKE ?
                    ORDER BY current_qty DESC
                    LIMIT 20`;
        data = await this.dataSource.query(sql, [`%${param}%`]);
        if (data.length === 0) {
          sql = `SELECT 
                            HanaPart, Description, QtyRemain,
                            Loc_Shelf AS Shelf, Loc_Level AS Level, Loc_Box AS Box,
                            ExpirationDate, PUID, StatusName
                        FROM inventory_receive
                        WHERE HanaPart LIKE ? OR Description LIKE ?
                        ORDER BY QtyRemain DESC
                        LIMIT 20`;
          data = await this.dataSource.query(sql, [`%${param}%`, `%${param}%`]);
        }
        break;

      case 'stock_check':
        sql = `SELECT 
                        HanaPart, Description, 
                        QtyRemain, Qty AS QtyOriginal,
                        Loc_Shelf AS Shelf, Loc_Level AS Level, Loc_Box AS Box,
                        StatusName, PUID
                    FROM inventory_receive
                    WHERE (HanaPart LIKE ? OR PUID = ?)
                      AND QtyRemain > 0
                    ORDER BY QtyRemain DESC
                    LIMIT 20`;
        data = await this.dataSource.query(sql, [`%${param}%`, param]);
        if (data.length === 0) {
          sql = `SELECT 
                            part_name AS HanaPart, 
                            current_qty AS QtyRemain,
                            rack_name AS Shelf, level_no AS Level, box_code AS Box
                        FROM v_inventory_location
                        WHERE part_name LIKE ? AND current_qty > 0
                        LIMIT 20`;
          data = await this.dataSource.query(sql, [`%${param}%`]);
        }
        break;

      case 'expired_material':
        sql = `SELECT 
                        HanaPart, Description, 
                        ExpirationDate,
                        DATEDIFF(CURDATE(), ExpirationDate) AS DaysOverdue,
                        QtyRemain, PUID,
                        Loc_Shelf AS Shelf, Loc_Level AS Level, Loc_Box AS Box,
                        StatusName
                    FROM inventory_receive
                    WHERE ExpirationDate <= CURDATE()
                      AND ExpirationDate IS NOT NULL
                      AND QtyRemain > 0
                    ORDER BY ExpirationDate ASC`;
        data = await this.dataSource.query(sql);
        break;

      case 'near_expiry':
        sql = `SELECT 
                        HanaPart, Description,
                        ExpirationDate,
                        DATEDIFF(ExpirationDate, CURDATE()) AS DaysRemaining,
                        QtyRemain, PUID,
                        Loc_Shelf AS Shelf, Loc_Level AS Level, Loc_Box AS Box,
                        StatusName
                    FROM inventory_receive
                    WHERE ExpirationDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                      AND ExpirationDate IS NOT NULL
                      AND QtyRemain > 0
                    ORDER BY ExpirationDate ASC`;
        data = await this.dataSource.query(sql);
        break;

      case 'find_puid':
        sql = `SELECT 
                        PUID, HanaPart, Description,
                        QtyRemain, Qty AS QtyOriginal,
                        Loc_Shelf AS Shelf, Loc_Level AS Level, Loc_Box AS Box,
                        ExpirationDate, StatusName, LotNo, DateCode
                    FROM inventory_receive
                    WHERE PUID = ?
                    LIMIT 1`;
        data = await this.dataSource.query(sql, [param]);
        break;

      case 'rack_items':
        sql = `SELECT 
                        part_name AS HanaPart,
                        current_qty AS QtyRemain,
                        rack_name AS Shelf,
                        level_no AS Level,
                        box_code AS Box,
                        slot_no AS Slot,
                        earliest_expiration AS ExpirationDate
                    FROM v_inventory_location
                    WHERE rack_name = ?
                    ORDER BY part_name ASC`;
        data = await this.dataSource.query(sql, [param]);
        break;

      case 'search_item':
        sql = `SELECT 
                        HanaPart, Description,
                        QtyRemain, PUID,
                        Loc_Shelf AS Shelf, Loc_Level AS Level, Loc_Box AS Box,
                        ExpirationDate, StatusName
                    FROM inventory_receive
                    WHERE HanaPart LIKE ?
                       OR Description LIKE ?
                       OR PUID LIKE ?
                    ORDER BY QtyRemain DESC
                    LIMIT 20`;
        data = await this.dataSource.query(sql, [`%${param}%`, `%${param}%`, `%${param}%`]);
        if (data.length === 0) {
          sql = `SELECT 
                            part_name AS HanaPart,
                            current_qty AS QtyRemain,
                            rack_name AS Shelf, level_no AS Level, box_code AS Box,
                            earliest_expiration AS ExpirationDate
                        FROM v_inventory_location
                        WHERE part_name LIKE ?
                        ORDER BY current_qty DESC
                        LIMIT 20`;
          data = await this.dataSource.query(sql, [`%${param}%`]);
        }
        break;

      case 'list_all':
        sql = `SELECT 
                        HanaPart, Description,
                        QtyRemain, PUID,
                        Loc_Shelf AS Shelf, Loc_Level AS Level, Loc_Box AS Box,
                        ExpirationDate, StatusName
                    FROM inventory_receive
                    WHERE QtyRemain > 0
                    ORDER BY HanaPart ASC
                    LIMIT 50`;
        data = await this.dataSource.query(sql);
        break;

      default:
        sql = `SELECT 
                        HanaPart, Description,
                        QtyRemain, PUID,
                        Loc_Shelf AS Shelf, Loc_Level AS Level, Loc_Box AS Box,
                        ExpirationDate, StatusName
                    FROM inventory_receive
                    ORDER BY HanaPart ASC
                    LIMIT 20`;
        data = await this.dataSource.query(sql);
        break;
    }

    return {
      data,
      count: data.length,
      sql,
    };
  }
}
