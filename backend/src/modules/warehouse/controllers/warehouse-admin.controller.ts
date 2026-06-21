import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { CreateBoxDto } from '../dto/create-box.dto';
import { CreateEthernetIoDto } from '../dto/create-ethernet-io.dto';
import { CreateLevelDto } from '../dto/create-level.dto';
import { CreateProductDto } from '../dto/create-product.dto';
import { CreateRackDto } from '../dto/create-rack.dto';
import { CreateSlotDto } from '../dto/create-slot.dto';
import { UpdateBoxDto } from '../dto/update-box.dto';
import { UpdateEthernetIoDto } from '../dto/update-ethernet-io.dto';
import { UpdateLevelDto } from '../dto/update-level.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { UpdateRackDto } from '../dto/update-rack.dto';
import { UpdateSlotDto } from '../dto/update-slot.dto';
import { UpdateFifoSettingsDto } from '../dto/update-fifo-settings.dto';
import { AppSettingsService } from '../services/app-settings.service';
import { IoDeviceService } from '../services/io-device.service';
import { WarehouseService } from '../services/warehouse.service';

@ApiTags('warehouse-admin')
@ApiBearerAuth('access-token')
@Roles('manage')
@Controller('warehouse/admin')
export class WarehouseAdminController {
  constructor(
    private readonly warehouseService: WarehouseService,
    private readonly appSettingsService: AppSettingsService,
  ) {}

  // --- Racks ---

  @Get('racks')
  @ApiOperation({ summary: 'List all racks (admin)' })
  listRacks() {
    return this.warehouseService.findAllRacks();
  }

  @Get('racks/:id')
  @ApiOperation({ summary: 'Get rack by ID (admin)' })
  @ApiParam({ name: 'id', type: Number })
  getRack(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.getRackDetails(id);
  }

  @Post('racks')
  @ApiOperation({ summary: 'Create a rack' })
  createRack(@Body() dto: CreateRackDto) {
    return this.warehouseService.createRack(dto);
  }

  @Patch('racks/:id')
  @ApiOperation({ summary: 'Update a rack' })
  @ApiParam({ name: 'id', type: Number })
  updateRack(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRackDto,
  ) {
    return this.warehouseService.updateRack(id, dto);
  }

  @Delete('racks/:id')
  @ApiOperation({ summary: 'Delete a rack' })
  @ApiParam({ name: 'id', type: Number })
  async deleteRack(@Param('id', ParseIntPipe) id: number) {
    await this.warehouseService.deleteRack(id);
    return { deleted: true };
  }

  // --- Levels ---

  @Get('levels')
  @ApiOperation({ summary: 'List all levels' })
  listLevels() {
    return this.warehouseService.findAllLevels();
  }

  @Get('levels/:id')
  @ApiOperation({ summary: 'Get level by ID' })
  @ApiParam({ name: 'id', type: Number })
  getLevel(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.findLevelById(id);
  }

  @Post('levels')
  @ApiOperation({ summary: 'Create a level' })
  createLevel(@Body() dto: CreateLevelDto) {
    return this.warehouseService.createLevel(dto);
  }

  @Patch('levels/:id')
  @ApiOperation({ summary: 'Update a level' })
  @ApiParam({ name: 'id', type: Number })
  updateLevel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLevelDto,
  ) {
    return this.warehouseService.updateLevel(id, dto);
  }

  @Delete('levels/:id')
  @ApiOperation({ summary: 'Delete a level' })
  @ApiParam({ name: 'id', type: Number })
  async deleteLevel(@Param('id', ParseIntPipe) id: number) {
    await this.warehouseService.deleteLevel(id);
    return { deleted: true };
  }

  // --- Boxes ---

  @Get('boxes')
  @ApiOperation({ summary: 'List all boxes' })
  listBoxes() {
    return this.warehouseService.findAllBoxes();
  }

  @Get('boxes/:id')
  @ApiOperation({ summary: 'Get box by ID' })
  @ApiParam({ name: 'id', type: Number })
  getBox(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.findBoxById(id);
  }

  @Post('boxes')
  @ApiOperation({ summary: 'Create a box' })
  createBox(@Body() dto: CreateBoxDto) {
    return this.warehouseService.createBox(dto);
  }

  @Patch('boxes/:id')
  @ApiOperation({ summary: 'Update a box' })
  @ApiParam({ name: 'id', type: Number })
  updateBox(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBoxDto,
  ) {
    return this.warehouseService.updateBox(id, dto);
  }

  @Delete('boxes/:id')
  @ApiOperation({ summary: 'Delete a box' })
  @ApiParam({ name: 'id', type: Number })
  async deleteBox(@Param('id', ParseIntPipe) id: number) {
    await this.warehouseService.deleteBox(id);
    return { deleted: true };
  }

  // --- Slots ---

  @Get('slots')
  @ApiOperation({ summary: 'List all slots' })
  listSlots() {
    return this.warehouseService.findAllSlots();
  }

  @Get('slots/:id')
  @ApiOperation({ summary: 'Get slot by ID' })
  @ApiParam({ name: 'id', type: Number })
  getSlot(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.findSlotById(id);
  }

  @Post('slots')
  @ApiOperation({ summary: 'Create a slot' })
  createSlot(@Body() dto: CreateSlotDto) {
    return this.warehouseService.createSlot(dto);
  }

  @Patch('slots/:id')
  @ApiOperation({ summary: 'Update a slot' })
  @ApiParam({ name: 'id', type: Number })
  updateSlot(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSlotDto,
  ) {
    return this.warehouseService.updateSlot(id, dto);
  }

  @Delete('slots/:id')
  @ApiOperation({ summary: 'Delete a slot' })
  @ApiParam({ name: 'id', type: Number })
  async deleteSlot(@Param('id', ParseIntPipe) id: number) {
    await this.warehouseService.deleteSlot(id);
    return { deleted: true };
  }

  // --- Products ---

  @Get('fifo-settings')
  @ApiOperation({ summary: 'Get issue policy settings (FIFO / FEFO)' })
  getFifoSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.appSettingsService.getFifoSettings(user.lang === 'en');
  }

  @Patch('fifo-settings')
  @ApiOperation({ summary: 'Update issue policy (password required)' })
  updateFifoSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateFifoSettingsDto,
  ) {
    return this.appSettingsService.updateFifoSettings(
      user.id,
      dto.fifoIssueMode,
      dto.fifoDummyIm,
      dto.confirmPassword,
    );
  }

  @Get('products/box-options')
  @ApiOperation({ summary: 'List boxes for product mapping filter' })
  listProductBoxOptions() {
    return this.warehouseService.findProductBoxOptions();
  }

  @Get('products/empty-slots')
  @ApiOperation({ summary: 'List empty slots available for product mapping' })
  @ApiQuery({ name: 'boxId', required: false, type: Number })
  @ApiQuery({ name: 'currentSlotId', required: false, type: Number })
  listEmptyProductSlots(
    @Query('boxId') boxId?: string,
    @Query('currentSlotId') currentSlotId?: string,
  ) {
    const parsedBoxId = boxId ? parseInt(boxId, 10) : undefined;
    const parsedSlotId = currentSlotId
      ? parseInt(currentSlotId, 10)
      : undefined;
    return this.warehouseService.findEmptyProductSlots(
      parsedBoxId && !Number.isNaN(parsedBoxId) ? parsedBoxId : undefined,
      parsedSlotId && !Number.isNaN(parsedSlotId) ? parsedSlotId : undefined,
    );
  }

  @Get('products/next-empty-slot')
  @ApiOperation({ summary: 'Get next empty slot for sequential mapping' })
  @ApiQuery({ name: 'boxId', required: false, type: Number })
  getNextEmptyProductSlot(@Query('boxId') boxId?: string) {
    const parsed = boxId ? parseInt(boxId, 10) : undefined;
    return this.warehouseService.findNextEmptyProductSlot(
      parsed && !Number.isNaN(parsed) ? parsed : undefined,
    );
  }

  @Get('products')
  @ApiOperation({ summary: 'List products with location info' })
  @ApiQuery({ name: 'boxId', required: false, type: Number })
  listProducts(@Query('boxId') boxId?: string) {
    const parsed = boxId ? parseInt(boxId, 10) : undefined;
    return this.warehouseService.findProductsAdmin(
      parsed && !Number.isNaN(parsed) ? parsed : undefined,
    );
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({ name: 'id', type: Number })
  getProduct(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.findProductById(id);
  }

  @Post('products')
  @ApiOperation({ summary: 'Create a product' })
  createProduct(@Body() dto: CreateProductDto) {
    return this.warehouseService.createProduct(dto);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', type: Number })
  updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.warehouseService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', type: Number })
  async deleteProduct(@Param('id', ParseIntPipe) id: number) {
    await this.warehouseService.deleteProduct(id);
    return { deleted: true };
  }
}

@ApiTags('io-devices')
@ApiBearerAuth('access-token')
@Roles('manage')
@Controller('io')
export class IoDevicesAdminController {
  constructor(private readonly ioDeviceService: IoDeviceService) {}

  @Get('devices')
  @ApiOperation({ summary: 'List all Ethernet IO devices' })
  listDevices() {
    return this.ioDeviceService.findAll();
  }

  @Get('devices/:id')
  @ApiOperation({ summary: 'Get Ethernet IO device by ID' })
  @ApiParam({ name: 'id', type: Number })
  getDevice(@Param('id', ParseIntPipe) id: number) {
    return this.ioDeviceService.findById(id);
  }

  @Post('devices')
  @ApiOperation({ summary: 'Create an Ethernet IO device' })
  createDevice(@Body() dto: CreateEthernetIoDto) {
    return this.ioDeviceService.create(dto);
  }

  @Patch('devices/:id')
  @ApiOperation({ summary: 'Update an Ethernet IO device' })
  @ApiParam({ name: 'id', type: Number })
  updateDevice(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEthernetIoDto,
  ) {
    return this.ioDeviceService.update(id, dto);
  }

  @Delete('devices/:id')
  @ApiOperation({ summary: 'Delete an Ethernet IO device' })
  @ApiParam({ name: 'id', type: Number })
  async deleteDevice(@Param('id', ParseIntPipe) id: number) {
    await this.ioDeviceService.delete(id);
    return { deleted: true };
  }
}
