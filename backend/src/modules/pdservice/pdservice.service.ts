import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PdserviceClient, PdservicePuidData } from './pdservice.client';

@Injectable()
export class PdserviceService {
  constructor(private readonly pdserviceClient: PdserviceClient) {}

  async fetchByPuid(puid: string, hanaPart?: string): Promise<PdservicePuidData> {
    const trimmed = puid.trim();
    if (!trimmed) {
      throw new BadRequestException('PUID is required');
    }

    const result = await this.pdserviceClient.fetchPuid(trimmed);

    if (!result.ok || !result.data) {
      throw new BadGatewayException(
        result.error ?? 'Cannot reach PDService API',
      );
    }

    const data = this.normalizePuidData(result.data, trimmed);

    if (hanaPart?.trim() && data.HanaPart && data.HanaPart !== hanaPart.trim()) {
      throw new BadRequestException(
        `PUID belongs to part ${data.HanaPart}, not ${hanaPart.trim()}`,
      );
    }

    return data;
  }

  async healthCheck(): Promise<{ ok: boolean; message: string; httpCode: number }> {
    const result = await this.pdserviceClient.fetchPuid('test');
    return {
      ok: result.ok,
      message: result.ok ? 'PDService reachable' : result.error ?? 'Unreachable',
      httpCode: result.httpCode,
    };
  }

  private normalizePuidData(
    apiData: PdservicePuidData,
    puid: string,
  ): PdservicePuidData {
    return {
      ReceiveDate: apiData.ReceiveDate ?? new Date().toISOString(),
      PUID: apiData.PUID ?? puid,
      IM: apiData.IM ?? '',
      Customer: apiData.Customer ?? '',
      HanaPart: apiData.HanaPart ?? '',
      Description: apiData.Description ?? '',
      MnfPartNo: apiData.MnfPartNo ?? '',
      LotNo: apiData.LotNo ?? '',
      DateCode: apiData.DateCode ?? '',
      BinSize: apiData.BinSize ?? '',
      Qty: Number(apiData.Qty ?? 0),
      QtyRemain: Number(apiData.QtyRemain ?? apiData.Qty ?? 0),
      McID: apiData.McID ?? '',
      MachineName: apiData.MachineName ?? '',
      StatusName: apiData.StatusName ?? '',
      ExpirationDate: apiData.ExpirationDate ?? '',
      OldIM: apiData.OldIM ?? '',
      Remark: apiData.Remark ?? '',
      Loc_Shelf: apiData.Loc_Shelf ?? '',
      Loc_Level: apiData.Loc_Level ?? '',
      Loc_Box: apiData.Loc_Box ?? '',
      ExpireDate_RoomTemp: apiData.ExpireDate_RoomTemp ?? '',
    };
  }
}
