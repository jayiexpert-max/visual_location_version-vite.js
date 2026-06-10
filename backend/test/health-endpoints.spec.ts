describe('Health endpoint paths', () => {
  const base = '/api/v1/health';

  const endpoints = [
    '',
    '/database',
    '/mqtt',
    '/raspi',
    '/cpk',
    '/pdservice',
    '/socketio',
    '/system',
    '/dashboard',
  ];

  it.each(endpoints)('documents %s route', (suffix) => {
    expect(`${base}${suffix}`).toMatch(/^\/api\/v1\/health/);
  });
});
