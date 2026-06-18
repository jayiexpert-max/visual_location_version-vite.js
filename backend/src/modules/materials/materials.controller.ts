import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateMaterialDto, UpdateMaterialDto } from './dto/material.dto';
import { MaterialsService } from './materials.service';

@ApiTags('materials')
@ApiBearerAuth('access-token')
@Roles('manage')
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  @ApiOperation({ summary: 'List materials master catalog' })
  findAll(@Query() pagination: PaginationDto, @Query('search') search?: string) {
    return this.materialsService.findAll(pagination, search);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export materials as CSV (matches PHP export_materials.php)' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(
    @Query('search') search?: string,
    @Query('lang') lang?: string,
  ): Promise<StreamableFile> {
    const language = lang === 'th' ? 'th' : 'en';
    const csv = await this.materialsService.exportCsv(search, language);
    const filename = `materials_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}.csv`;
    const buffer = Buffer.from(`\uFEFF${csv}`, 'utf-8');

    return new StreamableFile(buffer, {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('import')
  @ApiOperation({ summary: 'Import materials from CSV (upsert by material code)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  importCsv(@UploadedFile() file?: { buffer: Buffer; originalname?: string }) {
    if (!file?.buffer?.length) {
      throw new BadRequestException({
        message: 'Please select a CSV file first',
        code: 'MATERIAL_CSV_EMPTY',
      });
    }
    return this.materialsService.importCsv(file.buffer);
  }

  @Post()
  @ApiOperation({ summary: 'Create material' })
  create(@Body() dto: CreateMaterialDto) {
    return this.materialsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update material' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMaterialDto) {
    return this.materialsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete material' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.materialsService.remove(id);
    return { success: true };
  }
}
