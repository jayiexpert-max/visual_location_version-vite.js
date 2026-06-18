import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PdserviceService } from '../../pdservice/pdservice.service';
import { InventoryReceiveRepository } from '../repositories/inventory-receive.repository';

function normalizePuidInput(puid: string): string {
  return puid.trim().toUpperCase().replace(/^VL/i, '');
}

function puidLookupCandidates(puid: string): string[] {
  const trimmed = puid.trim();
  if (!trimmed) return [];
  const stripped = normalizePuidInput(trimmed);
  return [...new Set([trimmed, trimmed.toUpperCase(), stripped, stripped ? `VL${stripped}` : ''].filter(Boolean))];
}

export interface InventoryLookupData {
  ReceiveDate?: string;
  PUID: string;
  IM?: string;
  Customer?: string;
  HanaPart: string;
  Description?: string;
  MnfPartNo?: string;
  LotNo?: string;
  DateCode?: string;
  BinSize?: string;
  Qty: number;
  QtyRemain: number;
  McID?: string;
  MachineName?: string;
  StatusName?: string;
  ExpirationDate?: string;
  OldIM?: string;
  Remark?: string;
  Loc_Shelf?: string;
  Loc_Level?: string | number;
  Loc_Box?: string;
  Loc_Slot?: number;
  slot_id?: number;
  box_id?: number;
  ReservationNo?: string;
}

export interface InventoryLookupResponse {
  status: 'success' | 'error';
  message?: string;
  data?: InventoryLookupData;
  pdserviceOffline?: boolean;
  pdserviceWarning?: string;
}

@Injectable()
export class InventoryLookupService {
  private readonly logger = new Logger(InventoryLookupService.name);

  constructor(
    private readonly pdserviceService: PdserviceService,
    private readonly inventoryReceiveRepository: InventoryReceiveRepository,
    private readonly dataSource: DataSource,
  ) {}

  async lookupByPuid(puidInput: string, hanaPart?: string): Promise<InventoryLookupResponse> {
    const puid = normalizePuidInput(puidInput);
    if (!puid) {
      return { status: 'error', message: 'PUID is required' };
    }

    const hana = hanaPart?.trim() ?? '';

    try {
      const pdData = await this.pdserviceService.fetchByPuid(puid, hana || undefined);
      const found = this.mapPdserviceData(pdData, puid);
      return this.resolveLocation(found);
    } catch (error) {
      this.logger.warn(
        `PDService lookup failed for ${puid}: ${error instanceof Error ? error.message : error}`,
      );

      const local = await this.fetchLocalFallback(puid, hana);
      if (local) {
        return {
          status: 'success',
          data: local,
          pdserviceOffline: true,
          pdserviceWarning:
            'PDService unavailable — using local warehouse data.',
        };
      }

      const message =
        error instanceof BadRequestException || error instanceof BadGatewayException
          ? String((error.getResponse() as { message?: string })?.message ?? error.message)
          : 'Cannot reach PDService API';

      return { status: 'error', message };
    }
  }

  private mapPdserviceData(
    apiData: Record<string, unknown>,
    puid: string,
  ): InventoryLookupData {
    const rawQty = Number(apiData.QtyRemain ?? apiData.Qty ?? 0);
    const qtyRemain = rawQty > 0 ? rawQty : Number(apiData.Qty ?? 0);

    return {
      ReceiveDate: String(apiData.ReceiveDate ?? new Date().toISOString()),
      PUID: String(apiData.PUID ?? puid),
      IM: String(apiData.IM ?? ''),
      Customer: String(apiData.Customer ?? ''),
      HanaPart: String(apiData.HanaPart ?? ''),
      Description: String(apiData.Description ?? ''),
      MnfPartNo: String(apiData.MnfPartNo ?? ''),
      LotNo: String(apiData.LotNo ?? ''),
      DateCode: String(apiData.DateCode ?? ''),
      BinSize: String(apiData.BinSize ?? ''),
      Qty: Number(apiData.Qty ?? qtyRemain),
      QtyRemain: qtyRemain,
      McID: String(apiData.McID ?? ''),
      MachineName: String(apiData.MachineName ?? ''),
      StatusName: String(apiData.StatusName ?? 'Available'),
      ExpirationDate: String(apiData.ExpirationDate ?? ''),
      OldIM: String(apiData.OldIM ?? ''),
      Remark: String(apiData.Remark ?? ''),
      Loc_Shelf: String(apiData.Loc_Shelf ?? ''),
      Loc_Level: apiData.Loc_Level !== undefined ? String(apiData.Loc_Level) : '',
      Loc_Box: String(apiData.Loc_Box ?? ''),
    };
  }

  private async fetchLocalFallback(
    puid: string,
    hana: string,
  ): Promise<InventoryLookupData | null> {
    const row = await this.inventoryReceiveRepository.findByPuidCandidates(
      puidLookupCandidates(puid),
    );
    if (!row) return null;

    if (hana && row.hanaPart && row.hanaPart !== hana) {
      return null;
    }

    return {
      ReceiveDate: row.receiveDate?.toISOString() ?? new Date().toISOString(),
      PUID: row.puid ?? puid,
      IM: row.im ?? '',
      Customer: row.customer ?? '',
      HanaPart: row.hanaPart ?? hana,
      Description: row.description ?? '',
      MnfPartNo: row.mnfPartNo ?? '',
      LotNo: row.lotNo ?? '',
      DateCode: row.dateCode ?? '',
      BinSize: '',
      Qty: row.qty ?? row.qtyRemain ?? 0,
      QtyRemain: row.qtyRemain ?? row.qty ?? 0,
      StatusName: row.statusName ?? 'Available',
      ExpirationDate: row.expirationDate?.toISOString().slice(0, 10) ?? '',
      Loc_Shelf: row.locShelf ?? '',
      Loc_Level: row.locLevel ?? '',
      Loc_Box: row.locBox ?? '',
    };
  }

  private async resolveLocation(
    found: InventoryLookupData,
  ): Promise<InventoryLookupResponse> {
    let shelf = found.Loc_Shelf ?? '';
    let levelNo = Number(found.Loc_Level ?? 0);
    let boxCode = found.Loc_Box ?? '';

    if (!shelf || !boxCode) {
      const byPart = await this.dataSource.query<
        Array<{
          shelf: string;
          level_no: number;
          box_code: string;
          box_id: number;
          slot_id: number;
          slot_no: number;
        }>
      >(
        `SELECT r.name AS shelf, lv.level_no, bx.box_code, bx.id AS box_id, p.slot_id, sl.slot_no
         FROM products p
         JOIN slots sl ON p.slot_id = sl.id
         JOIN boxes bx ON sl.box_id = bx.id
         JOIN levels lv ON bx.level_id = lv.id
         JOIN racks r ON lv.rack_id = r.id
         WHERE p.name = ?
         ORDER BY p.qty DESC
         LIMIT 1`,
        [found.HanaPart],
      );

      const loc = byPart[0];
      if (loc) {
        shelf = loc.shelf;
        levelNo = loc.level_no;
        boxCode = loc.box_code;
        found.Loc_Shelf = shelf;
        found.Loc_Level = levelNo;
        found.Loc_Box = boxCode;
        found.box_id = loc.box_id;
        found.slot_id = loc.slot_id;
        found.Loc_Slot = loc.slot_no;
      }
    }

    if (shelf && boxCode && !found.box_id) {
      const boxRows = await this.dataSource.query<Array<{ box_id: number }>>(
        `SELECT bx.id AS box_id
         FROM boxes bx
         JOIN levels lv ON bx.level_id = lv.id
         JOIN racks r ON lv.rack_id = r.id
         WHERE r.name = ? AND lv.level_no = ? AND bx.box_code = ?
         LIMIT 1`,
        [shelf, levelNo, boxCode],
      );

      if (boxRows[0]) {
        found.box_id = boxRows[0].box_id;
        if (!found.slot_id) {
          const slotRows = await this.dataSource.query<
            Array<{ id: number; slot_no: number }>
          >('SELECT id, slot_no FROM slots WHERE box_id = ? ORDER BY id ASC LIMIT 1', [
            found.box_id,
          ]);
          if (slotRows[0]) {
            found.slot_id = slotRows[0].id;
            found.Loc_Slot = slotRows[0].slot_no;
          }
        }
      }
    }

    if (!found.Loc_Shelf || !found.Loc_Box) {
      return {
        status: 'error',
        message: `No storage location registered for part "${found.HanaPart}"`,
      };
    }

    if (!found.slot_id) {
      return {
        status: 'error',
        message: `Could not resolve slot for part "${found.HanaPart}"`,
      };
    }

    return { status: 'success', data: found };
  }
}
