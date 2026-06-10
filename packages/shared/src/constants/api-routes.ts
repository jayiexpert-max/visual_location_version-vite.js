export const API_V1 = '/api/v1' as const;

export const AuthRoutes = {
  login: `${API_V1}/auth/login`,
  refresh: `${API_V1}/auth/refresh`,
  logout: `${API_V1}/auth/logout`,
  me: `${API_V1}/auth/me`,
} as const;

export const CpkRoutes = {
  version: `${API_V1}/cpk/version`,
  reservation: (keyword: string) => `${API_V1}/cpk/reservations/${encodeURIComponent(keyword)}`,
  publicUid: `${API_V1}/cpk/public-uid`,
  reservationReceive: `${API_V1}/cpk/reservations/receive`,
  puidReturn: `${API_V1}/cpk/puid/return`,
  picklistsOpen: `${API_V1}/cpk/picklists/open`,
  picklistsDetail: `${API_V1}/cpk/picklists/detail`,
  picklistsIssue: `${API_V1}/cpk/picklists/issue`,
  picklistsClose: `${API_V1}/cpk/picklists/close`,
  stationInventory: `${API_V1}/cpk/station/inventory`,
  cacheClear: `${API_V1}/cpk/cache/clear`,
} as const;

export const SocketEvents = {
  highlightUpdate: 'highlight:update',
  highlightClear: 'highlight:clear',
  picklistCount: 'picklist:count',
} as const;

export const MqttTopics = {
  highlight: (deviceId: number) => `visual/io/${deviceId}/highlight`,
  off: (deviceId: number) => `visual/io/${deviceId}/off`,
  reset: 'visual/io/reset',
} as const;
