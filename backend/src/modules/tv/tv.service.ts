import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { TvHighlightRepository } from './tv-highlight.repository';
import type { SetTvHighlightDto, TvHighlightResponseDto } from './dto/tv-highlight.dto';
import { HighlightGateway } from '../realtime/highlight.gateway';

@Injectable()
export class TvService {
  constructor(
    private readonly configService: ConfigService,
    private readonly tvHighlightRepository: TvHighlightRepository,
    private readonly highlightGateway: HighlightGateway,
  ) {}

  async setHighlight(
    dto: SetTvHighlightDto,
    searchedBy?: string,
  ): Promise<TvHighlightResponseDto> {
    if (!dto.productName && !dto.boxId) {
      throw new BadRequestException('productName or boxId is required');
    }

    if (dto.boxId <= 0) {
      throw new BadRequestException('boxId is required for highlight');
    }

    const durationSec = this.configService.get<number>(
      'mqtt.highlightDurationSec',
      60,
    );
    const expiresAt = new Date(Date.now() + durationSec * 1000);
    const slotNo =
      dto.slotNo !== undefined && dto.slotNo !== ''
        ? Number(dto.slotNo)
        : null;

    const saved = await this.tvHighlightRepository.saveHighlight({
      productName: dto.productName ?? null,
      puid: dto.puid?.trim() || null,
      boxId: dto.boxId,
      slotId: dto.slotId ?? null,
      slotNo: Number.isFinite(slotNo) ? slotNo : null,
      rackName: dto.rackName ?? null,
      levelNo:
        dto.levelNo !== undefined && dto.levelNo !== ''
          ? Number(dto.levelNo)
          : null,
      boxCode: dto.boxCode ?? null,
      qty: dto.qty ?? 0,
      searchedBy: dto.searchedBy ?? searchedBy ?? null,
      highlightSeq: randomUUID(),
      actionType: dto.actionType ?? 'highlight',
      expiresAt,
    });

    const response = this.toResponse(saved);
    this.highlightGateway.emitHighlightUpdate(response);
    return response;
  }

  async getHighlight(): Promise<TvHighlightResponseDto | null> {
    const active = await this.tvHighlightRepository.findActive();
    if (!active) {
      return null;
    }

    if (active.expiresAt.getTime() <= Date.now()) {
      await this.tvHighlightRepository.deleteAll();
      return null;
    }

    return this.toResponse(active);
  }

  async clearHighlight(): Promise<void> {
    await this.tvHighlightRepository.deleteAll();
    this.highlightGateway.emitHighlightClear();
  }

  private toResponse(entity: {
    id: string;
    productName: string | null;
    puid: string | null;
    boxId: number;
    slotId: number | null;
    slotNo: number | null;
    rackName: string | null;
    levelNo: number | null;
    boxCode: string | null;
    qty: number;
    searchedBy: string | null;
    highlightSeq: string;
    actionType: string;
    expiresAt: Date;
    createdAt: Date;
  }): TvHighlightResponseDto {
    return {
      id: entity.id,
      productName: entity.productName,
      puid: entity.puid,
      boxId: entity.boxId,
      slotId: entity.slotId,
      slotNo: entity.slotNo,
      rackName: entity.rackName,
      levelNo: entity.levelNo,
      boxCode: entity.boxCode,
      qty: entity.qty,
      searchedBy: entity.searchedBy,
      highlightSeq: entity.highlightSeq,
      actionType: entity.actionType,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
    };
  }
}
