import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InventoryLookupService } from '../inventory/services/inventory-lookup.service';
import { CpkService } from './cpk.service';

export interface BookingEligibility {
  eligible: boolean;
  destination: string;
  blockers: string[];
  blockers_th: string[];
}

export interface BookingOutPreviewData {
  PUID: string;
  HanaPart: string;
  Description: string;
  IM: string;
  LotNo: string;
  Qty: number;
  QtyRemain: number;
  McID: string;
  MachineName: string;
  StatusName: string;
  ExpirationDate: string;
  Customer: string;
  DateCode: string;
  Location: string;
  cpk_effective_remain: number | null;
  preview_sources: string[];
  booking_eligibility: Record<'STORE' | 'OTHER', BookingEligibility>;
}

@Injectable()
export class BookingOutPreviewService {
  private readonly logger = new Logger(BookingOutPreviewService.name);

  constructor(
    private readonly inventoryLookup: InventoryLookupService,
    private readonly configService: ConfigService,
    private readonly cpkService: CpkService,
  ) {}

  async preview(puidInput: string): Promise<BookingOutPreviewData> {
    const puid = puidInput.trim().toUpperCase().replace(/^VL/i, '');
    this.validatePuid(puid);

    const lookup = await this.inventoryLookup.lookupByPuid(puid);
    if (lookup.status !== 'success' || !lookup.data) {
      throw new BadRequestException(
        lookup.message ??
          'PUID not found in PDService, local warehouse, or CPK station inventory.',
      );
    }

    const d = lookup.data;
    const sources = new Set<string>();
    if (!lookup.pdserviceOffline) sources.add('pdservice');
    if (d.Loc_Shelf || d.slot_id) sources.add('local');

    let cpkEffectiveRemain: number | null = null;
    try {
      const station = await this.cpkService.stationInvenCheck({
        PUID: puid,
        PartNumber: d.HanaPart || undefined,
      });
      if (station && typeof station === 'object') {
        const qty = Number(
          (station as Record<string, unknown>).Quantity ??
            (station as Record<string, unknown>).Qty ??
            (station as Record<string, unknown>).QtyRemain,
        );
        if (!Number.isNaN(qty)) {
          cpkEffectiveRemain = qty;
          sources.add('cpk_station');
        }
      }
    } catch (err) {
      this.logger.debug(
        `Station inventory check skipped for ${puid}: ${err instanceof Error ? err.message : err}`,
      );
    }

    if (!sources.size) sources.add('local');

    const locationParts = [
      d.Loc_Shelf,
      d.Loc_Level != null && d.Loc_Level !== '' ? `L${d.Loc_Level}` : '',
      d.Loc_Box ? `Box ${d.Loc_Box}` : '',
    ].filter(Boolean);

    const found: BookingOutPreviewData = {
      PUID: d.PUID,
      HanaPart: d.HanaPart,
      Description: d.Description ?? '',
      IM: d.IM ?? '',
      LotNo: d.LotNo ?? '',
      Qty: d.Qty,
      QtyRemain: d.QtyRemain,
      McID: d.McID ?? '',
      MachineName: d.MachineName ?? '',
      StatusName: d.StatusName ?? '',
      ExpirationDate: d.ExpirationDate ?? '',
      Customer: d.Customer ?? '',
      DateCode: d.DateCode ?? '',
      Location: locationParts.join(' '),
      cpk_effective_remain: cpkEffectiveRemain,
      preview_sources: [...sources],
      booking_eligibility: {
        STORE: this.eligibility(
          { ...d, cpk_effective_remain: cpkEffectiveRemain, preview_sources: [...sources] },
          'STORE',
        ),
        OTHER: this.eligibility(
          { ...d, cpk_effective_remain: cpkEffectiveRemain, preview_sources: [...sources] },
          'OTHER',
        ),
      },
    };

    return found;
  }

  private validatePuid(puid: string): void {
    if (!puid) {
      throw new BadRequestException('PUID is required');
    }
    if (puid.length > 64) {
      throw new BadRequestException('PUID must be at most 64 characters');
    }
    if (/DUMMYBATCH|MAT_DOC/i.test(puid)) {
      throw new BadRequestException('Real PUID only (no DUMMYBATCH / MAT_DOC)');
    }
  }

  private eligibility(
    found: {
      McID?: string;
      ExpirationDate?: string;
      cpk_effective_remain?: number | null;
      preview_sources?: string[];
    },
    destination: 'STORE' | 'OTHER',
  ): BookingEligibility {
    const blockers: string[] = [];
    const blockersTh: string[] = [];
    const sources = found.preview_sources ?? [];
    const inStation =
      sources.includes('cpk_station') || found.cpk_effective_remain != null;

    if (!inStation) {
      blockers.push(
        'Service Rejected: PUID is not in this station local stock area',
      );
      blockersTh.push(
        'Service Rejected: PUID ไม่ได้อยู่ในพื้นที่ Local Stock ของสถานีนี้',
      );
    }

    const stationMcId = this.configService.get<string>('cpk.mcId', '').trim();
    const puidMcId = String(found.McID ?? '').trim();
    if (stationMcId && puidMcId && Number(puidMcId) !== Number(stationMcId)) {
      blockers.push(
        `Service Rejected: PUID is not in this station local stock area (McID ${puidMcId} ≠ station ${stationMcId})`,
      );
      blockersTh.push(
        `Service Rejected: PUID ไม่ได้อยู่ในพื้นที่ Local Stock ของสถานีนี้ (McID ${puidMcId} ≠ สถานี ${stationMcId})`,
      );
    }

    if (destination === 'STORE') {
      const exp = String(found.ExpirationDate ?? '').trim();
      if (exp) {
        const expTs = Date.parse(exp);
        if (!Number.isNaN(expTs)) {
          const days = Math.floor((expTs - Date.now()) / 86400000);
          if (days < 31) {
            blockers.push(
              'Service Rejected: PUID expires within 31 days and cannot be sent to STORE',
            );
            blockersTh.push(
              'Service Rejected: PUID ใกล้หมดอายุ (ภายใน 31 วัน) ส่งไป STORE ไม่ได้',
            );
          }
        }
      }
    }

    return {
      eligible: blockers.length === 0,
      destination,
      blockers,
      blockers_th: blockersTh,
    };
  }
}
