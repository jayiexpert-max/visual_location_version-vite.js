/**
 * One-off: summarize booking-out preview eligibility (no secrets printed).
 * Usage: node scripts/test-booking-out-preview.mjs PUID1 PUID2 ...
 */
import 'dotenv/config';

const base = process.env.APP_BASE_URL ?? 'http://localhost:3000';
const puids = process.argv.slice(2);
if (!puids.length) {
  console.error('Usage: node scripts/test-booking-out-preview.mjs <PUID> [...]');
  process.exit(1);
}

const loginRes = await fetch(`${base}/api/v1/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: '057412', password: '057412', deviceType: 'desktop' }),
});
const loginJson = await loginRes.json();
const token = loginJson?.data?.accessToken;
if (!token) {
  console.error('Login failed:', loginJson?.message ?? 'no token');
  process.exit(1);
}

for (const puid of puids) {
  const res = await fetch(
    `${base}/api/v1/cpk/booking-out/preview?puid=${encodeURIComponent(puid)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const json = await res.json();
  const data = json?.data ?? json;
  const el = data?.booking_eligibility ?? {};
  console.log(`\n=== ${puid} ===`);
  if (json?.status === 'error') {
    console.log('API error:', json.message);
    continue;
  }
  console.log('ExpirationDate:', data.ExpirationDate);
  console.log('McID:', data.McID, 'cpk_remain:', data.cpk_effective_remain);
  console.log('sources:', data.preview_sources);
  if (data.cpk_station_check) {
    console.log('cpk_station_check:', data.cpk_station_check.Status, '-', data.cpk_station_check.Message);
  }
  for (const dest of ['STORE', 'OTHER']) {
    const e = el[dest] ?? {};
    console.log(`${dest} eligible:`, e.eligible);
    for (const b of e.blockers ?? []) console.log(`  - ${b}`);
  }
}
