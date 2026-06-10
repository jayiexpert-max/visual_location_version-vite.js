import type { WarehouseHierarchy } from '../../types/warehouse';

export interface LocationOption {
  slotId: number;
  slotNo: number;
  boxId: number;
  boxCode: string;
  levelNo: number;
  rackId: number;
  rackName: string;
  label: string;
}

export function flattenWarehouseLocations(hierarchy: WarehouseHierarchy): LocationOption[] {
  const options: LocationOption[] = [];

  for (const rack of hierarchy.racks) {
    for (const level of rack.levels) {
      for (const box of level.boxes) {
        for (const slot of box.slots) {
          options.push({
            slotId: slot.id,
            slotNo: slot.slotNo,
            boxId: box.id,
            boxCode: box.boxCode,
            levelNo: level.levelNo,
            rackId: rack.id,
            rackName: rack.name,
            label: `${rack.name} / L${level.levelNo} / ${box.boxCode} / Slot ${slot.slotNo}`,
          });
        }
      }
    }
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export function formatLocationLabel(
  rackName: string,
  levelNo: number,
  boxCode: string,
  slotNo: number,
): string {
  return `${rackName} / L${levelNo} / ${boxCode} / Slot ${slotNo}`;
}
