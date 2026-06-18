import { apiGet } from './apiClient';

export interface WoBomPlanLine {
  itemList: unknown;
  opCode: unknown;
  materialCode: string;
  description: string;
  requiredPerUnit: number;
  requiredQty: number;
  systemStockQty: number;
  usableStockQty: number;
  puidCount: number;
  recommendedPuid: string | null;
  earliestExpiration: string | null;
  expiryStatus: 'ok' | 'near' | 'expired' | 'unknown';
  expiredRolls: number;
  nearExpiryRolls: number;
  substoreStockQty: number;
  substorePuidCount: number;
  sufficient: boolean;
}

export interface WoBomPlanInfo {
  workOrder: string;
  assemblyName: string;
  assemblyRevision: string;
  dataUpdatedTime: string;
}

export interface WoBomPlanResult {
  workOrder: string;
  info: WoBomPlanInfo;
  lines: WoBomPlanLine[];
}

export async function getWoBomPlan(workOrder: string): Promise<WoBomPlanResult> {
  return apiGet(`/wo-bom/${encodeURIComponent(workOrder.trim())}`);
}
