import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { TvHighlight } from '../../../entities/tv-highlight.entity';
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
    private readonly configService: ConfigService,
    @InjectRepository(TvHighlight)
    private readonly tvHighlightRepository: Repository<TvHighlight>,
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
    const durationSec = this.configService.get<number>(
      'mqtt.highlightDurationSec',
      60,
    );
    const expiresAt = new Date(Date.now() + durationSec * 1000);
    const highlightSeq = randomUUID().replace(/-/g, '');

    await this.tvHighlightRepository.delete({});
    await this.tvHighlightRepository.save(
      this.tvHighlightRepository.create({
        productName: location.part_name,
        boxId: location.box_id,
        slotId: location.slot_id,
        slotNo: location.slot_no,
        rackName: location.rack_name,
        levelNo: location.level_no,
        boxCode: location.box_code,
        qty: location.current_qty,
        searchedBy: user?.username ?? dto.query,
        highlightSeq,
        actionType: 'highlight',
        expiresAt,
      }),
    );

    const ioDeviceId = box?.ioDeviceId ?? box?.level?.rack?.ioDeviceId ?? null;
    const outputPin = box?.ioOutputPin ?? box?.level?.rack?.ioGreenPin ?? null;

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
        highlightSeq,
        productName: location.part_name,
        boxId: location.box_id,
        slotId: location.slot_id,
        slotNo: location.slot_no,
        rackName: location.rack_name,
        levelNo: location.level_no,
        boxCode: location.box_code,
        qty: location.current_qty,
        expiresAt: expiresAt.toISOString(),
      },
      io:
        ioDeviceId && outputPin
          ? {
              deviceId: ioDeviceId,
              outputPin,
              status: 'stub',
            }
          : null,
    };
  }
}
