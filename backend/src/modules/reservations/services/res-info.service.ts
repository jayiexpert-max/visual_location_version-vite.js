import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CpkService } from '../../cpk/cpk.service';
import { InventoryReceiveRepository } from '../../inventory/repositories/inventory-receive.repository';
import { ReservationRepository } from '../repositories/reservation.repository';
import {
  cpkAsPuidList,
  cpkIsPuidReceivedFlag,
  cpkItemRequestQty,
  cpkPuidQtyRemain,
  normalizeResInfo,
  normalizeResNo,
  puidLookupCandidates,
  type CpkRecord,
} from '../utils/cpk-res-parse';

export interface ResInfoMeta {
  itemCount: number;
  puidCount: number;
  listStatus: string;
}

export interface ResInfoResponse {
  status: 'success' | 'error';
  message?: string;
  data?: CpkRecord;
  meta?: ResInfoMeta;
  httpCode?: number;
}

const INACTIVE_STATUSES = new Set(['Withdrawn', 'Empty', 'Is empty']);

@Injectable()
export class ResInfoService {
  private readonly logger = new Logger(ResInfoService.name);

  constructor(
    private readonly cpkService: CpkService,
    private readonly inventoryReceiveRepository: InventoryReceiveRepository,
    private readonly reservationRepository: ReservationRepository,
  ) {}

  async fetchWithLocal(resNoInput: string): Promise<ResInfoResponse> {
    const resNo = normalizeResNo(resNoInput);
    if (!resNo) {
      return { status: 'error', message: 'RES Number is required' };
    }

    let cpkBody: Record<string, unknown>;
    try {
      cpkBody = (await this.cpkService.getResNoInfo(resNo)) as Record<string, unknown>;
    } catch (error) {
      const message =
        error instanceof BadGatewayException
          ? String((error.getResponse() as { message?: string })?.message ?? error.message)
          : error instanceof Error
            ? error.message
            : 'Cannot reach CPK API';
      return { status: 'error', message };
    }

    const statusFlag = String(cpkBody.Status ?? cpkBody.status ?? '').toUpperCase();
    if (statusFlag === 'E') {
      return {
        status: 'error',
        message: String(cpkBody.Message ?? cpkBody.message ?? 'Reservation not found'),
      };
    }

    const apiData = normalizeResInfo(cpkBody);
    const items = (apiData.Items as CpkRecord[]) ?? [];

    if (items.length === 0) {
      return {
        status: 'error',
        message: 'No reservation data from API or invalid format',
      };
    }

    let listStatus = 'Pending';

    try {
      for (const item of items) {
        const partNumber = String(
          item.PartNumber ?? item.MatNumber ?? item.HanaPart ?? '',
        ).trim();
        const itemRequestQty = cpkItemRequestQty(item);
        const puidList = cpkAsPuidList(item.PUIDList ?? []);

        for (const p of puidList) {
          const puid = String(p.PUID ?? '').trim();
          const cpkReceived = cpkIsPuidReceivedFlag(p.Received);

          if (puid) {
            const row = await this.findActiveLocalRow(puid);
            p.is_already_in_db = Boolean(row);
            p.QtyRemain = this.resolvePuidQtyRemain(
              p,
              cpkReceived,
              row,
              itemRequestQty,
            );
            p.cpk_received = cpkReceived;
            p.is_received = p.is_already_in_db || cpkReceived;
          } else {
            p.is_already_in_db = false;
            p.cpk_received = cpkReceived;
            p.is_received = cpkReceived;
            p.QtyRemain = cpkPuidQtyRemain(p) ?? itemRequestQty;
          }
        }

        item.PUIDList = puidList;
      }

      const resNoLog = String(apiData.ReservationNo ?? resNo);
      const allReceived = items.every((item) => {
        const puids = cpkAsPuidList(item.PUIDList ?? []);
        return puids.length > 0 && puids.every((p) => Boolean(p.is_received));
      });

      if (allReceived) {
        listStatus = 'Completed';
      }

      await this.reservationRepository.upsertStatus(resNoLog, listStatus);
    } catch (error) {
      apiData.local_db_error =
        error instanceof Error ? error.message : 'Local DB enrichment failed';
      this.logger.warn(`RES ${resNo} local enrichment error: ${apiData.local_db_error}`);
    }

    const puidCount = items.reduce(
      (sum, item) => sum + cpkAsPuidList(item.PUIDList ?? []).length,
      0,
    );

    return {
      status: 'success',
      message: `RES ${String(apiData.ReservationNo ?? resNo)} status refreshed (${listStatus})`,
      data: apiData,
      meta: {
        itemCount: items.length,
        puidCount,
        listStatus,
      },
    };
  }

  private async findActiveLocalRow(puid: string) {
    const row = await this.inventoryReceiveRepository.findByPuidCandidates(
      puidLookupCandidates(puid),
    );
    if (!row) return null;
    const status = String(row.statusName ?? '');
    if (INACTIVE_STATUSES.has(status)) return null;
    return row;
  }

  private resolvePuidQtyRemain(
    p: CpkRecord,
    cpkReceived: boolean,
    localRow: { qtyRemain?: number | null; qty?: number | null } | null,
    itemRequestQty: number | null,
  ): number | null {
    const cpkQty = cpkPuidQtyRemain(p);
    const localQty = this.localQtyValue(localRow);

    if (cpkReceived && cpkQty !== null && cpkQty > 0) return cpkQty;
    if (localQty !== null) return localQty;
    if (cpkQty !== null && cpkQty > 0) return cpkQty;
    if (itemRequestQty !== null && itemRequestQty > 0) return itemRequestQty;
    return null;
  }

  private localQtyValue(
    localRow: { qtyRemain?: number | null; qty?: number | null } | null,
  ): number | null {
    if (!localRow) return null;
    const remain = Number(localRow.qtyRemain ?? 0);
    if (remain > 0) return remain;
    const qty = Number(localRow.qty ?? 0);
    return qty > 0 ? qty : null;
  }
}
