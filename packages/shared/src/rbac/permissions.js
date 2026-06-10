"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_MENU_ACCESS = exports.MENU_KEYS = void 0;
exports.canAccessMenu = canAccessMenu;
exports.MENU_KEYS = [
    'dashboard',
    'search',
    'receiveReservation',
    'receiveReturn',
    'picklist',
    'rackOverview',
    'expiryCheck',
    'layout3d',
    'tvDisplay',
    'stockReports',
    'userManagement',
    'systemAdmin',
    'handheld',
];
exports.ROLE_MENU_ACCESS = {
    user: [
        'dashboard',
        'search',
        'rackOverview',
        'expiryCheck',
        'stockReports',
        'handheld',
    ],
    material_prep: [
        'dashboard',
        'search',
        'receiveReservation',
        'receiveReturn',
        'picklist',
        'rackOverview',
        'expiryCheck',
        'stockReports',
        'handheld',
    ],
    admin: [
        'dashboard',
        'search',
        'receiveReservation',
        'receiveReturn',
        'picklist',
        'rackOverview',
        'expiryCheck',
        'layout3d',
        'tvDisplay',
        'stockReports',
        'userManagement',
        'systemAdmin',
        'handheld',
    ],
};
function canAccessMenu(role, menu) {
    return exports.ROLE_MENU_ACCESS[role].includes(menu);
}
//# sourceMappingURL=permissions.js.map