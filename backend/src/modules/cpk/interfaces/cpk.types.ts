export type CpkStatus = 'S' | 'E';

export interface CpkResponseBody {
  Status?: CpkStatus;
  Message?: string;
  ReceiveDone?: boolean;
  Warnings?: unknown[];
  PublicUID?: string;
  ExpiredDate?: string;
  [key: string]: unknown;
}

export interface CpkHttpResult {
  ok: boolean;
  httpCode: number;
  data: CpkResponseBody | string | null;
  raw: string;
  error: string | null;
  cpkStatus: CpkStatus | null;
  cpkMessage: string | null;
}

export interface PublicUidResult {
  ok: boolean;
  publicUid: string | null;
  message: string;
  data: CpkResponseBody | null;
}

export type CpkLogicalEndpoint =
  | 'GetVersion'
  | 'GET_RESNoInfo'
  | 'GetPublicUID'
  | 'RES_PUIDRecv'
  | 'IssuePUIDToPicklist'
  | 'UpdatePUIDStatus'
  | 'GetOpenPicklists'
  | 'GetPicklistDetail'
  | 'ClosePicklist'
  | 'StationInvenCheck'
  | 'BookingOutPUID'
  | 'GET_WOBOMInfo'
  | 'ClearCache';
