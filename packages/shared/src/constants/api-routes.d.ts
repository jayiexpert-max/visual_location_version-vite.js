export declare const API_V1: "/api/v1";
export declare const AuthRoutes: {
    readonly login: "/api/v1/auth/login";
    readonly refresh: "/api/v1/auth/refresh";
    readonly logout: "/api/v1/auth/logout";
    readonly me: "/api/v1/auth/me";
};
export declare const CpkRoutes: {
    readonly version: "/api/v1/cpk/version";
    readonly reservation: (keyword: string) => string;
    readonly publicUid: "/api/v1/cpk/public-uid";
    readonly reservationReceive: "/api/v1/cpk/reservations/receive";
    readonly puidReturn: "/api/v1/cpk/puid/return";
    readonly picklistsOpen: "/api/v1/cpk/picklists/open";
    readonly picklistsDetail: "/api/v1/cpk/picklists/detail";
    readonly picklistsIssue: "/api/v1/cpk/picklists/issue";
    readonly picklistsClose: "/api/v1/cpk/picklists/close";
    readonly stationInventory: "/api/v1/cpk/station/inventory";
    readonly cacheClear: "/api/v1/cpk/cache/clear";
};
export declare const SocketEvents: {
    readonly highlightUpdate: "highlight:update";
    readonly highlightClear: "highlight:clear";
    readonly picklistCount: "picklist:count";
};
export declare const MqttTopics: {
    readonly highlight: (deviceId: number) => string;
    readonly off: (deviceId: number) => string;
    readonly reset: "visual/io/reset";
};
