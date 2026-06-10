import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { IoService } from '../../io/io.service';
import { TvService } from '../../tv/tv.service';
import { BoxRepository } from '../../warehouse/repositories/box.repository';
import {
  HighlightDto,
  HighlightResponseDto,
} from '../dto/highlight.dto';
import { InventoryService } from './inventory.service';

@Injectable()
export class HighlightService {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly boxRepository: BoxRepository,
    private readonly tvService: TvService,
    private readonly ioService: IoService,
  ) {}

  async buildHighlight(
    dto: HighlightDto,
    user?: AuthenticatedUser,
  ): Promise<HighlightResponseDto> {
    const location = await this.inventoryService.findLocationByPartOrSlot(
      dto.query,
      dto.slotId,
    );

    if (!location) {
      throw new NotFoundException({
        message: `No warehouse location found for "${dto.query}"`,
        code: 'INVENTORY_LOCATION_NOT_FOUND',
      });
    }

    const box = await this.boxRepository.findByIdWithSlots(location.box_id);

    const tv = await this.tvService.setHighlight(
      {
        productName: location.part_name,
        boxId: location.box_id,
        slotId: location.slot_id,
        slotNo: location.slot_no,
        rackName: location.rack_name,
        levelNo: location.level_no,
        boxCode: location.box_code,
        qty: location.current_qty,
        searchedBy: user?.username ?? dto.query,
        actionType: 'highlight',
      },
      user?.username,
    );

    let ioResult: HighlightResponseDto['io'] = null;

    const ioDeviceId = box?.ioDeviceId ?? box?.level?.rack?.ioDeviceId ?? null;
    const outputPin = box?.ioOutputPin ?? box?.level?.rack?.ioGreenPin ?? null;

    if (ioDeviceId && outputPin) {
      const command = await this.ioService.highlightBox(
        {
          boxId: location.box_id,
          slotNo: location.slot_no,
          slotId: location.slot_id,
        },
        user?.id,
      );

      ioResult = {
        deviceId: ioDeviceId,
        outputPin,
        status: command.status === 'success' ? 'published' : command.status,
      };
    }

    return {
      location: {
        rackId: location.rack_id,
        rackName: location.rack_name,
        levelNo: location.level_no,
        boxId: location.box_id,
        boxCode: location.box_code,
        slotId: location.slot_id,
        slotNo: location.slot_no,
      },
      tv: {
        highlightSeq: tv.highlightSeq,
        productName: tv.productName ?? location.part_name,
        boxId: tv.boxId,
        slotId: tv.slotId ?? location.slot_id,
        slotNo: tv.slotNo ?? location.slot_no,
        rackName: tv.rackName ?? location.rack_name,
        levelNo: tv.levelNo ?? location.level_no,
        boxCode: tv.boxCode ?? location.box_code,
        qty: tv.qty,
        expiresAt: tv.expiresAt.toISOString(),
      },
      io: ioResult,
    };
  }
}
