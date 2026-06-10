import { Injectable, NotFoundException } from '@nestjs/common';
import { Box } from '../../../entities/box.entity';
import { Level } from '../../../entities/level.entity';
import { Product } from '../../../entities/product.entity';
import { Rack } from '../../../entities/rack.entity';
import { Slot } from '../../../entities/slot.entity';
import { CreateBoxDto } from '../dto/create-box.dto';
import { CreateLevelDto } from '../dto/create-level.dto';
import { CreateProductDto } from '../dto/create-product.dto';
import { CreateRackDto } from '../dto/create-rack.dto';
import { CreateSlotDto } from '../dto/create-slot.dto';
import {
  HierarchyBoxDto,
  HierarchyLevelDto,
  HierarchyProductDto,
  HierarchyRackDto,
  HierarchySlotDto,
  WarehouseHierarchyResponseDto,
} from '../dto/warehouse-hierarchy-response.dto';
import { UpdateBoxDto } from '../dto/update-box.dto';
import { UpdateLevelDto } from '../dto/update-level.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { UpdateRackDto } from '../dto/update-rack.dto';
import { UpdateSlotDto } from '../dto/update-slot.dto';
import { BoxRepository } from '../repositories/box.repository';
import { LevelRepository } from '../repositories/level.repository';
import { ProductRepository } from '../repositories/product.repository';
import { RackRepository } from '../repositories/rack.repository';
import { SlotRepository } from '../repositories/slot.repository';

@Injectable()
export class WarehouseService {
  constructor(
    private readonly rackRepository: RackRepository,
    private readonly levelRepository: LevelRepository,
    private readonly boxRepository: BoxRepository,
    private readonly slotRepository: SlotRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  findAllRacks(): Promise<Rack[]> {
    return this.rackRepository.findAll();
  }

  async getRackDetails(rackId: number): Promise<Rack> {
    const rack = await this.rackRepository.findByIdWithLevels(rackId);

    if (!rack) {
      throw new NotFoundException({
        message: `Rack ${rackId} not found`,
        code: 'WAREHOUSE_RACK_NOT_FOUND',
      });
    }

    return rack;
  }

  async getHierarchy(): Promise<WarehouseHierarchyResponseDto> {
    const racks = await this.rackRepository.findAllWithHierarchy();

    return {
      racks: racks.map((rack) => this.mapRackToHierarchy(rack)),
    };
  }

  async getBoxProducts(boxId: number): Promise<Product[]> {
    const box = await this.boxRepository.findById(boxId);

    if (!box) {
      throw new NotFoundException({
        message: `Box ${boxId} not found`,
        code: 'WAREHOUSE_BOX_NOT_FOUND',
      });
    }

    return this.productRepository.findByBoxId(boxId);
  }

  // --- Rack CRUD ---

  createRack(dto: CreateRackDto): Promise<Rack> {
    return this.rackRepository.create(dto);
  }

  async updateRack(id: number, dto: UpdateRackDto): Promise<Rack> {
    await this.getRackDetails(id);
    const updated = await this.rackRepository.update(id, dto);

    if (!updated) {
      throw new NotFoundException({
        message: `Rack ${id} not found`,
        code: 'WAREHOUSE_RACK_NOT_FOUND',
      });
    }

    return updated;
  }

  async deleteRack(id: number): Promise<void> {
    await this.getRackDetails(id);
    await this.rackRepository.delete(id);
  }

  // --- Level CRUD ---

  findAllLevels(): Promise<Level[]> {
    return this.levelRepository.findAll();
  }

  async findLevelById(id: number): Promise<Level> {
    const level = await this.levelRepository.findById(id);

    if (!level) {
      throw new NotFoundException({
        message: `Level ${id} not found`,
        code: 'WAREHOUSE_LEVEL_NOT_FOUND',
      });
    }

    return level;
  }

  createLevel(dto: CreateLevelDto): Promise<Level> {
    return this.levelRepository.create(dto);
  }

  async updateLevel(id: number, dto: UpdateLevelDto): Promise<Level> {
    await this.findLevelById(id);
    const updated = await this.levelRepository.update(id, dto);

    if (!updated) {
      throw new NotFoundException({
        message: `Level ${id} not found`,
        code: 'WAREHOUSE_LEVEL_NOT_FOUND',
      });
    }

    return updated;
  }

  async deleteLevel(id: number): Promise<void> {
    await this.findLevelById(id);
    await this.levelRepository.delete(id);
  }

  // --- Box CRUD ---

  findAllBoxes(): Promise<Box[]> {
    return this.boxRepository.findAll();
  }

  async findBoxById(id: number): Promise<Box> {
    const box = await this.boxRepository.findById(id);

    if (!box) {
      throw new NotFoundException({
        message: `Box ${id} not found`,
        code: 'WAREHOUSE_BOX_NOT_FOUND',
      });
    }

    return box;
  }

  createBox(dto: CreateBoxDto): Promise<Box> {
    return this.boxRepository.create({
      ...dto,
      layout: dto.layout ?? '1x1',
    });
  }

  async updateBox(id: number, dto: UpdateBoxDto): Promise<Box> {
    await this.findBoxById(id);
    const updated = await this.boxRepository.update(id, dto);

    if (!updated) {
      throw new NotFoundException({
        message: `Box ${id} not found`,
        code: 'WAREHOUSE_BOX_NOT_FOUND',
      });
    }

    return updated;
  }

  async deleteBox(id: number): Promise<void> {
    await this.findBoxById(id);
    await this.boxRepository.delete(id);
  }

  // --- Slot CRUD ---

  findAllSlots(): Promise<Slot[]> {
    return this.slotRepository.findAll();
  }

  async findSlotById(id: number): Promise<Slot> {
    const slot = await this.slotRepository.findById(id);

    if (!slot) {
      throw new NotFoundException({
        message: `Slot ${id} not found`,
        code: 'WAREHOUSE_SLOT_NOT_FOUND',
      });
    }

    return slot;
  }

  createSlot(dto: CreateSlotDto): Promise<Slot> {
    return this.slotRepository.create(dto);
  }

  async updateSlot(id: number, dto: UpdateSlotDto): Promise<Slot> {
    await this.findSlotById(id);
    const updated = await this.slotRepository.update(id, dto);

    if (!updated) {
      throw new NotFoundException({
        message: `Slot ${id} not found`,
        code: 'WAREHOUSE_SLOT_NOT_FOUND',
      });
    }

    return updated;
  }

  async deleteSlot(id: number): Promise<void> {
    await this.findSlotById(id);
    await this.slotRepository.delete(id);
  }

  // --- Product CRUD ---

  findAllProducts(): Promise<Product[]> {
    return this.productRepository.findAll();
  }

  async findProductById(id: number): Promise<Product> {
    const product = await this.productRepository.findById(id);

    if (!product) {
      throw new NotFoundException({
        message: `Product ${id} not found`,
        code: 'WAREHOUSE_PRODUCT_NOT_FOUND',
      });
    }

    return product;
  }

  createProduct(dto: CreateProductDto): Promise<Product> {
    return this.productRepository.create({
      slotId: dto.slotId,
      name: dto.name ?? null,
      qty: dto.qty ?? 0,
      remark: dto.remark ?? null,
    });
  }

  async updateProduct(id: number, dto: UpdateProductDto): Promise<Product> {
    await this.findProductById(id);
    const updated = await this.productRepository.update(id, dto);

    if (!updated) {
      throw new NotFoundException({
        message: `Product ${id} not found`,
        code: 'WAREHOUSE_PRODUCT_NOT_FOUND',
      });
    }

    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    await this.findProductById(id);
    await this.productRepository.delete(id);
  }

  private mapRackToHierarchy(rack: Rack): HierarchyRackDto {
    return {
      id: rack.id,
      name: rack.name ?? '',
      locationDesc: rack.locationDesc,
      levels: (rack.levels ?? []).map((level) => this.mapLevelToHierarchy(level)),
    };
  }

  private mapLevelToHierarchy(level: Level): HierarchyLevelDto {
    return {
      id: level.id,
      levelNo: level.levelNo ?? 0,
      boxes: (level.boxes ?? []).map((box) => this.mapBoxToHierarchy(box)),
    };
  }

  private mapBoxToHierarchy(box: Box): HierarchyBoxDto {
    return {
      id: box.id,
      boxCode: box.boxCode ?? '',
      layout: box.layout,
      positionInLevel: box.positionInLevel,
      slots: (box.slots ?? []).map((slot) => this.mapSlotToHierarchy(slot)),
    };
  }

  private mapSlotToHierarchy(slot: Slot): HierarchySlotDto {
    return {
      id: slot.id,
      slotNo: slot.slotNo ?? 0,
      product: slot.product ? this.mapProductToHierarchy(slot.product) : null,
    };
  }

  private mapProductToHierarchy(product: Product): HierarchyProductDto {
    return {
      id: product.id,
      name: product.name ?? '',
      qty: product.qty,
    };
  }
}
