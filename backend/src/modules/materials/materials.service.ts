import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from '../../entities/material.entity';
import {
  buildPaginatedResult,
  getPaginationSkip,
  PaginationDto,
  type PaginatedResult,
} from '../../common/dto/pagination.dto';
import { CreateMaterialDto, UpdateMaterialDto } from './dto/material.dto';
import {
  buildMaterialsCsv,
  parseMaterialsCsv,
  type MaterialImportResult,
} from './materials-csv.util';

export type { MaterialImportResult };

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
  ) {}

  async findAll(
    pagination: PaginationDto,
    search?: string,
  ): Promise<PaginatedResult<Material>> {
    const skip = getPaginationSkip(pagination);
    const qb = this.materialRepository
      .createQueryBuilder('material')
      .orderBy('material.id', 'DESC');

    if (search?.trim()) {
      qb.andWhere(
        '(material.material_code LIKE :q OR material.description LIKE :q)',
        { q: `%${search.trim()}%` },
      );
    }

    const [items, total] = await qb.skip(skip).take(pagination.limit).getManyAndCount();
    return buildPaginatedResult(items, total, pagination);
  }

  async create(dto: CreateMaterialDto): Promise<Material> {
    const existing = await this.materialRepository.findOne({
      where: { materialCode: dto.materialCode },
    });
    if (existing) {
      throw new ConflictException({
        message: `Material code "${dto.materialCode}" already exists`,
        code: 'MATERIAL_CODE_CONFLICT',
      });
    }
    return this.materialRepository.save(
      this.materialRepository.create({
        materialCode: dto.materialCode,
        description: dto.description ?? null,
        remark: dto.remark ?? null,
      }),
    );
  }

  async update(id: number, dto: UpdateMaterialDto): Promise<Material> {
    const material = await this.requireMaterial(id);
    if (dto.materialCode && dto.materialCode !== material.materialCode) {
      const existing = await this.materialRepository.findOne({
        where: { materialCode: dto.materialCode },
      });
      if (existing) {
        throw new ConflictException({
          message: `Material code "${dto.materialCode}" already exists`,
          code: 'MATERIAL_CODE_CONFLICT',
        });
      }
      material.materialCode = dto.materialCode;
    }
    if (dto.description !== undefined) material.description = dto.description;
    if (dto.remark !== undefined) material.remark = dto.remark;
    return this.materialRepository.save(material);
  }

  async remove(id: number): Promise<void> {
    const material = await this.requireMaterial(id);
    await this.materialRepository.remove(material);
  }

  async exportCsv(search?: string, lang: 'th' | 'en' = 'en'): Promise<string> {
    const qb = this.materialRepository
      .createQueryBuilder('material')
      .orderBy('material.material_code', 'ASC');

    if (search?.trim()) {
      qb.andWhere(
        '(material.material_code LIKE :q OR material.description LIKE :q)',
        { q: `%${search.trim()}%` },
      );
    }

    const items = await qb.getMany();
    return buildMaterialsCsv(items, lang);
  }

  async importCsv(buffer: Buffer): Promise<MaterialImportResult> {
    if (!buffer?.length) {
      throw new BadRequestException({
        message: 'Please select a CSV file first',
        code: 'MATERIAL_CSV_EMPTY',
      });
    }

    const rows = parseMaterialsCsv(buffer);
    if (rows.length === 0) {
      throw new BadRequestException({
        message: 'No valid material rows found in CSV',
        code: 'MATERIAL_CSV_NO_ROWS',
      });
    }

    let added = 0;
    let updated = 0;

    await this.materialRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(Material);

      for (const row of rows) {
        const existing = await repo.findOne({
          where: { materialCode: row.materialCode },
        });

        if (existing) {
          existing.description = row.description || null;
          await repo.save(existing);
          updated += 1;
        } else {
          await repo.save(
            repo.create({
              materialCode: row.materialCode,
              description: row.description || null,
            }),
          );
          added += 1;
        }
      }
    });

    return { added, updated, total: added + updated };
  }

  async upsertFromInventoryReceive(input: {
    materialCode: string;
    description?: string | null;
    remark?: string | null;
  }): Promise<{ created: boolean; updated: boolean }> {
    const materialCode = input.materialCode.trim();
    if (!materialCode) {
      return { created: false, updated: false };
    }

    const description = input.description?.trim() || null;
    const remark = input.remark?.trim() || null;

    const existing = await this.materialRepository.findOne({
      where: { materialCode },
    });

    if (!existing) {
      await this.materialRepository.save(
        this.materialRepository.create({
          materialCode,
          description,
          remark,
        }),
      );
      this.logger.debug(`Material auto-created from receive: ${materialCode}`);
      return { created: true, updated: false };
    }

    let changed = false;
    if ((!existing.description || !existing.description.trim()) && description) {
      existing.description = description;
      changed = true;
    }
    if ((!existing.remark || !existing.remark.trim()) && remark) {
      existing.remark = remark;
      changed = true;
    }

    if (changed) {
      await this.materialRepository.save(existing);
      this.logger.debug(`Material auto-updated from receive: ${materialCode}`);
    }

    return { created: false, updated: changed };
  }

  private async requireMaterial(id: number): Promise<Material> {
    const material = await this.materialRepository.findOne({ where: { id } });
    if (!material) {
      throw new NotFoundException({
        message: `Material ${id} not found`,
        code: 'MATERIAL_NOT_FOUND',
      });
    }
    return material;
  }
}
