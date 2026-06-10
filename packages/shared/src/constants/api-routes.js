"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MqttTopics = exports.SocketEvents = exports.CpkRoutes = exports.AuthRoutes = exports.API_V1 = void 0;
exports.API_V1 = '/api/v1';
exports.AuthRoutes = {
    login: `${exports.API_V1}/auth/login`,
    refresh: `${exports.API_V1}/auth/refresh`,
    logout: `${exports.API_V1}/auth/logout`,
    me: `${exports.API_V1}/auth/me`,
};
exports.CpkRoutes = {
    version: `${exports.API_V1}/cpk/version`,
    reservation: (keyword) => `${exports.API_V1}/cpk/reservations/${encodeURIComponent(keyword)}`,
    publicUid: `${exports.API_V1}/cpk/public-uid`,
    reservationReceive: `${exports.API_V1}/cpk/reservations/receive`,
    puidReturn: `${exports.API_V1}/cpk/puid/return`,
    picklistsOpen: `${exports.API_V1}/cpk/picklists/open`,
    picklistsDetail: `${exports.API_V1}/cpk/picklists/detail`,
    picklistsIssue: `${exports.API_V1}/cpk/picklists/issue`,
    picklistsClose: `${exports.API_V1}/cpk/picklists/close`,
    stationInventory: `${exports.API_V1}/cpk/station/inventory`,
    cacheClear: `${exports.API_V1}/cpk/cache/clear`,
};
exports.SocketEvents = {
    highlightUpdate: 'highlight:update',
    highlightClear: 'highlight:clear',
    picklistCount: 'picklist:count',
};
exports.MqttTopics = {
    highlight: (deviceId) => `visual/io/${deviceId}/highlight`,
    off: (deviceId) => `visual/io/${deviceId}/off`,
    reset: 'visual/io/reset',
};
//# sourceMappingURL=api-routes.js.map