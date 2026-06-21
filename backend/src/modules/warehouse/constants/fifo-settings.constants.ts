export const APP_SETTING_FIFO_ISSUE_MODE = 'fifo_issue_mode';
export const APP_SETTING_FIFO_DUMMY_IM = 'fifo_dummy_im';

export const FIFO_ISSUE_MODE_EXPIRATION = 'expiration_date';
export const FIFO_ISSUE_MODE_IM_BATCH = 'im_batch';

export const DEFAULT_FIFO_DUMMY_IM = 'DUMMYBATCH';

export function isValidFifoIssueMode(mode: string): boolean {
  return mode === FIFO_ISSUE_MODE_EXPIRATION || mode === FIFO_ISSUE_MODE_IM_BATCH;
}

export function fifoIssueModeLabel(mode: string, isEn: boolean): string {
  if (mode === FIFO_ISSUE_MODE_IM_BATCH) {
    return isEn ? 'FIFO (IM Batch)' : 'FIFO (IM Batch)';
  }
  return isEn ? 'FEFO (Expired date)' : 'FEFO (วันหมดอายุ)';
}
