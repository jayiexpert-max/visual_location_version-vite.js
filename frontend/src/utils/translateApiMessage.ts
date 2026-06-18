import type { TFunction } from 'i18next';

const EXACT_KEYS: Record<string, string> = {
  'PUID is required': 'pages:apiMsgPuidRequired',
  'PUID expired — send for shelf-life extension': 'pages:apiMsgPuidExpired',
  'FIFO violation — issue earlier-expiration stock first': 'pages:apiMsgFifoViolation',
  'PicklistID and PUID are required': 'pages:apiMsgPicklistPuidRequired',
  'Operator is required': 'pages:apiMsgOperatorRequired',
  'PUID not found in local stock or already withdrawn': 'pages:apiMsgPuidNotInStock',
  'HanaPart missing for PUID': 'pages:apiMsgHanaPartMissing',
  'CPK McID not configured — saved to local warehouse only.': 'pages:apiMsgCpkMcIdMissing',
  'CPK unreachable — local save only; sync UpdatePUIDStatus when CPK is back.':
    'pages:apiMsgCpkUnreachable',
  'Skipped CPK receive (already received in CPK).': 'pages:apiMsgCpkReceiveSkipped',
  'CPK receive confirmation failed': 'pages:apiMsgCpkReceiveFailed',
  'CPK request timed out': 'pages:apiMsgCpkTimeout',
  'IssuePUIDToPicklist failed': 'pages:apiMsgPicklistIssueFailed',
};

const PATTERN_RULES: Array<{
  pattern: RegExp;
  key: string;
  map: (match: RegExpMatchArray) => Record<string, string | number>;
}> = [
  {
    pattern: /^PUID expired — send for shelf-life extension\. Use: (.+)$/i,
    key: 'pages:apiMsgPuidExpiredUse',
    map: (m) => ({ puid: m[1].trim() }),
  },
  {
    pattern: /^FIFO violation — issue (.+) first \(earlier expiration\)$/i,
    key: 'pages:apiMsgFifoViolationPuid',
    map: (m) => ({ puid: m[1].trim() }),
  },
  {
    pattern: /^Cannot issue long-life stock yet\. Issue near-expiry (.+) first\.$/i,
    key: 'pages:apiMsgLongLifeStock',
    map: (m) => ({ puid: m[1].trim() }),
  },
  {
    pattern: /^FIFO violation! Issue (.+) first \(earlier expiration\)$/i,
    key: 'pages:apiMsgFifoViolationStrict',
    map: (m) => ({ puid: m[1].trim() }),
  },
];

/** Map known backend / CPK English messages to the active UI locale. */
export function translateApiMessage(
  message: string | undefined | null,
  t: TFunction,
): string {
  if (!message) return '';
  const trimmed = message.trim();
  if (!trimmed) return '';

  const exactKey = EXACT_KEYS[trimmed];
  if (exactKey) return t(exactKey);

  for (const rule of PATTERN_RULES) {
    const match = trimmed.match(rule.pattern);
    if (match) return t(rule.key, rule.map(match));
  }

  return trimmed;
}

export function translateApiMessages(
  messages: string[] | undefined | null,
  t: TFunction,
): string {
  if (!messages?.length) return '';
  return messages.map((msg) => translateApiMessage(msg, t)).join(' ');
}
