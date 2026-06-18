import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryDeepPartialEntity, Repository } from 'typeorm';
import { Product } from '../../../entities/product.entity';

export interface ProductAdminRow {
  id: number;
  slotId: number | null;
  name: string | null;
  qty: number;
  remark: string | null;
  slotNo: number | null;
  boxId: number | null;
  boxCode: string | null;
  levelNo: number | null;
  rackName: string | null;
}

export interface ProductBoxOption {
  id: number;
  boxCode: string;
  layout: string | null;
  levelNo: number;
  rackName: string;
  slotTotal: number;
  mappedCount: number;
}

export interface ProductSlotOption {
  id: number;
  slotNo: number;
  boxId: number;
  boxCode: string;
  levelNo: number;
  rackName: string;
}

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repository: Repository<Product>,
  ) {}

  findAll(): Promise<Product[]> {
    return this.repository.find({ order: { id: 'ASC' } });
  }

  findById(id: number): Promise<Product | null> {
    return this.repository.findOne({
      where: { id },
      relations: { slot: true },
    });
  }

  findBySlotId(slotId: number): Promise<Product | null> {
    return this.repository.findOne({ where: { slotId } });
  }

  findByName(name: string, excludeId?: number): Promise<Product | null> {
    const qb = this.repository
      .createQueryBuilder('product')
      .where('product.name = :name', { name });
    if (excludeId != null) {
      qb.andWhere('product.id != :excludeId', { excludeId });
    }
    return qb.getOne();
  }

  findOccupyingSlot(slotId: number, excludeId?: number): Promise<Product | null> {
    const qb = this.repository
      .createQueryBuilder('product')
      .where('product.slot_id = :slotId', { slotId });
    if (excludeId != null) {
      qb.andWhere('product.id != :excludeId', { excludeId });
    }
    return qb.getOne();
  }

  findAllWithLocation(boxId?: number): Promise<ProductAdminRow[]> {
    const qb = this.repository
      .createQueryBuilder('p')
      .select([
        'p.id AS id',
        'p.slot_id AS slotId',
        'p.name AS name',
        'p.qty AS qty',
        'p.remark AS remark',
        'sl.slot_no AS slotNo',
        'b.id AS boxId',
        'b.box_code AS boxCode',
        'l.level_no AS levelNo',
        'r.name AS rackName',
      ])
      .innerJoin('p.slot', 'sl')
      .innerJoin('sl.box', 'b')
      .innerJoin('b.level', 'l')
      .innerJoin('l.rack', 'r')
      .orderBy('r.name', 'ASC')
      .addOrderBy('l.level_no', 'ASC')
      .addOrderBy('b.box_code', 'ASC')
      .addOrderBy('sl.slot_no', 'ASC');

    if (boxId != null && boxId > 0) {
      qb.andWhere('b.id = :boxId', { boxId });
    }

    return qb.getRawMany<ProductAdminRow>();
  }

  findProductBoxOptions(): Promise<ProductBoxOption[]> {
    return this.repository.manager
      .createQueryBuilder()
      .select([
        'b.id AS id',
        'b.box_code AS boxCode',
        'b.layout AS layout',
        'l.level_no AS levelNo',
        'r.name AS rackName',
        'COUNT(sl.id) AS slotTotal',
        'SUM(CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END) AS mappedCount',
      ])
      .from('boxes', 'b')
      .innerJoin('levels', 'l', 'b.level_id = l.id')
      .innerJoin('racks', 'r', 'l.rack_id = r.id')
      .leftJoin('slots', 'sl', 'sl.box_id = b.id')
      .leftJoin('products', 'p', 'p.slot_id = sl.id')
      .groupBy('b.id')
      .addGroupBy('b.box_code')
      .addGroupBy('b.layout')
      .addGroupBy('l.level_no')
      .addGroupBy('r.name')
      .orderBy('r.name', 'ASC')
      .addOrderBy('l.level_no', 'ASC')
      .addOrderBy('b.box_code', 'ASC')
      .getRawMany<ProductBoxOption>();
  }

  findEmptySlotOptions(
    boxId?: number,
    currentSlotId?: number,
  ): Promise<ProductSlotOption[]> {
    const qb = this.repository.manager
      .createQueryBuilder()
      .select([
        'sl.id AS id',
        'sl.slot_no AS slotNo',
        'b.id AS boxId',
        'b.box_code AS boxCode',
        'l.level_no AS levelNo',
        'r.name AS rackName',
      ])
      .from('slots', 'sl')
      .innerJoin('boxes', 'b', 'sl.box_id = b.id')
      .innerJoin('levels', 'l', 'b.level_id = l.id')
      .innerJoin('racks', 'r', 'l.rack_id = r.id')
      .leftJoin('products', 'p', 'p.slot_id = sl.id')
      .where('(p.id IS NULL OR sl.id = :currentSlotId)', {
        currentSlotId: currentSlotId ?? 0,
      })
      .orderBy('r.name', 'ASC')
      .addOrderBy('l.level_no', 'ASC')
      .addOrderBy('b.box_code', 'ASC')
      .addOrderBy('sl.slot_no', 'ASC');

    if (boxId != null && boxId > 0) {
      qb.andWhere('sl.box_id = :boxId', { boxId });
    }

    return qb.getRawMany<ProductSlotOption>();
  }

  async findFirstEmptySlot(boxId?: number): Promise<number | null> {
    const qb = this.repository.manager
      .createQueryBuilder()
      .select('sl.id', 'id')
      .from('slots', 'sl')
      .innerJoin('boxes', 'b', 'sl.box_id = b.id')
      .innerJoin('levels', 'l', 'b.level_id = l.id')
      .innerJoin('racks', 'r', 'l.rack_id = r.id')
      .leftJoin('products', 'p', 'p.slot_id = sl.id')
      .where('p.id IS NULL')
      .orderBy('r.name', 'ASC')
      .addOrderBy('l.level_no', 'ASC')
      .addOrderBy('b.box_code', 'ASC')
      .addOrderBy('sl.slot_no', 'ASC')
      .limit(1);

    if (boxId != null && boxId > 0) {
      qb.andWhere('sl.box_id = :boxId', { boxId });
    }

    const row = await qb.getRawOne<{ id: number }>();
    return row?.id ?? null;
  }

  findByBoxId(boxId: number): Promise<Product[]> {
    return this.repository
      .createQueryBuilder('product')
      .innerJoin('product.slot', 'slot')
      .where('slot.box_id = :boxId', { boxId })
      .orderBy('slot.slot_no', 'ASC')
      .getMany();
  }

  create(data: Partial<Product>): Promise<Product> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: number, data: Partial<Product>): Promise<Product | null> {
    await this.repository.update(id, data as QueryDeepPartialEntity<Product>);
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
