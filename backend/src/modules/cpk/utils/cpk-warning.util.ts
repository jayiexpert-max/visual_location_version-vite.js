import { BadGatewayException } from '@nestjs/common';
import type { CpkResponseBody } from '../interfaces/cpk.types';

export function extractCpkWarningMessages(body: CpkResponseBody): string[] {
  const warnings = body.Warnings;
  if (!Array.isArray(warnings)) return [];

  return warnings
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (entry && typeof entry === 'object') {
        const obj = entry as Record<string, unknown>;
        const message = obj.Message ?? obj.message;
        return typeof message === 'string' ? message.trim() : '';
      }
      return '';
    })
    .filter((msg) => msg.length > 0);
}

/** Throws when CPK reports failure despite HTTP 200 (ReceiveDone=false). */
export function assertCpkReceiveAccepted(body: CpkResponseBody): void {
  if (body.ReceiveDone === false) {
    throw new BadGatewayException({
      message: String(body.Message ?? 'CPK receive confirmation failed'),
      code: 'CPK_RECEIVE_FAILED',
    });
  }
}
