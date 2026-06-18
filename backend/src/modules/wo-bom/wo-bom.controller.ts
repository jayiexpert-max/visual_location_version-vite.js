import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { WoBomService } from './wo-bom.service';

@ApiTags('wo-bom')
@ApiBearerAuth('access-token')
@Controller('wo-bom')
export class WoBomController {
  constructor(private readonly woBomService: WoBomService) {}

  @Get(':workOrder')
  @Roles('admin', 'manage', 'material_prep')
  @ApiOperation({ summary: 'WO BOM plan with local stock comparison (GET_WOBOMInfo + inventory)' })
  getBomPlan(@Param('workOrder') workOrder: string) {
    return this.woBomService.getBomPlan(workOrder);
  }
}
