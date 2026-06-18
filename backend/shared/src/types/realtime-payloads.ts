export interface ReservationUpdatePayload {
  resNo: string;
  puid?: string;
  action: 'received';
  operator?: string;
  timestamp: string;
}

export interface PicklistUpdatePayload {
  picklistId: string;
  puid?: string;
  action: 'issue' | 'close';
  operator?: string;
  timestamp: string;
}
