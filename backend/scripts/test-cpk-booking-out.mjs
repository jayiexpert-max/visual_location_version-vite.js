/**
 * Probe CPK StationInvenCheck + BookingOutPUID responses (Status/Message only).
 * Does NOT print PublicUID or tokens.
 *
 * Usage:
 *   node scripts/test-cpk-booking-out.mjs <PUID> [--submit STORE|OTHER]
 *
 * Without --submit: only StationInvenCheck (read-only).
 * With --submit: calls BookingOutPUID (destructive — moves PUID out of local stock).
 */
import 'dotenv/config';

const base = process.env.APP_BASE_URL ?? 'http://localhost:3000';
const args = process.argv.slice(2);
const submitIdx = args.indexOf('--submit');
const puid = (submitIdx >= 0 ? args.slice(0, submitIdx) : args)[0]?.trim().toUpperCase();
const destination = submitIdx >= 0 ? args[submitIdx + 1]?.toUpperCase() : null;

if (!puid) {
  console.error('Usage: node scripts/test-cpk-booking-out.mjs <PUID> [--submit STORE|OTHER]');
  process.exit(1);
}

async function login() {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: '057412', password: '057412', deviceType: 'desktop' }),
  });
  const json = await res.json();
  const token = json?.data?.accessToken;
  if (!token) throw new Error(json?.message ?? 'login failed');
  return token;
}

function summarizeCpk(label, json) {
  const data = json?.data ?? json;
  console.log(`\n--- ${label} ---`);
  if (json?.status === 'error' && !data?.Status) {
    console.log('API error:', json.message);
    if (json.code) console.log('code:', json.code);
    return;
  }
  console.log('Status:', data.Status ?? '(none)');
  console.log('Message:', data.Message ?? '(none)');
  const warnings = data.Warnings;
  if (Array.isArray(warnings) && warnings.length) {
    console.log('Warnings:', warnings.length);
    for (const w of warnings.slice(0, 5)) {
      const msg = typeof w === 'string' ? w : w?.Message ?? w?.message ?? JSON.stringify(w);
      console.log('  -', msg);
    }
  }
  const qty = data.Quantity ?? data.Qty ?? data.QtyRemain;
  if (qty != null) console.log('Qty:', qty);
  const extraKeys = ['PUID', 'HanaPart', 'PartNumber', 'InStock', 'IsInStation', 'StatusName'];
  for (const key of extraKeys) {
    if (data[key] != null) console.log(`${key}:`, data[key]);
  }
}

const token = await login();

const stationRes = await fetch(`${base}/api/v1/cpk/station/inventory`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ PUID: puid }),
});
summarizeCpk('StationInvenCheck', await stationRes.json());

const previewRes = await fetch(
  `${base}/api/v1/cpk/booking-out/preview?puid=${encodeURIComponent(puid)}`,
  { headers: { Authorization: `Bearer ${token}` } },
);
const previewJson = await previewRes.json();
const preview = previewJson?.data ?? previewJson;
console.log('\n--- Preview eligibility ---');
for (const dest of ['STORE', 'OTHER']) {
  const e = preview?.booking_eligibility?.[dest] ?? {};
  console.log(`${dest}: eligible=${e.eligible}`);
  for (const b of e.blockers ?? []) console.log(`  - ${b}`);
}

if (destination) {
  if (destination !== 'STORE' && destination !== 'OTHER') {
    console.error('destination must be STORE or OTHER');
    process.exit(1);
  }
  console.log(`\n*** Submitting BookingOutPUID → ${destination} (destructive) ***`);
  const bookRes = await fetch(`${base}/api/v1/cpk/booking-out`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ puid, operator: '057412', destination }),
  });
  summarizeCpk('BookingOutPUID', await bookRes.json());
} else {
  console.log('\n(skip BookingOutPUID — pass --submit STORE|OTHER to execute)');
}
