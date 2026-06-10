export interface Rack {
    id: number;
    name: string;
    locationDesc: string | null;
    ioDeviceId: number | null;
    ioRedPin: number | null;
    ioYellowPin: number | null;
    ioGreenPin: number | null;
    ioBuzzerPin: number | null;
}
export interface Level {
    id: number;
    rackId: number;
    levelNo: number;
}
export interface Box {
    id: number;
    levelId: number;
    boxCode: string;
    positionInLevel: number | null;
    layout: string;
    ioDeviceId: number | null;
    ioOutputPin: number | null;
}
export interface Slot {
    id: number;
    boxId: number;
    slotNo: number;
}
export interface Product {
    id: number;
    slotId: number;
    name: string;
    qty: number;
}
export interface InventoryReceive {
    id: number;
    puid: string;
    reservationNo: string | null;
    hanaPart: string;
    qty: number;
    qtyRemain: number;
    statusName: string;
    expirationDate: string | null;
    locShelf: string | null;
    locLevel: string | null;
    locBox: string | null;
}
export interface LocationPath {
    rackId: number;
    rackName: string;
    levelId: number;
    levelNo: number;
    boxId: number;
    boxCode: string;
    slotId: number;
    slotNo: number;
}
