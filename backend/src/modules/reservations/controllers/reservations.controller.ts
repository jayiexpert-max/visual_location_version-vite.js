import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ReservationsService } from '../services/reservations.service';

@ApiTags('reservations')
@ApiBearerAuth('access-token')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  @ApiOperation({ summary: 'List reservations from reservation_list' })
  list() {
    return this.reservationsService.list();
  }

  @Get(':resNo/detail')
  @Roles('admin', 'manage', 'material_prep')
  @ApiOperation({
    summary: 'Fetch enriched reservation detail from CPK with local cross-reference',
  })
  @ApiParam({ name: 'resNo', type: String })
  getDetail(@Param('resNo') resNo: string) {
    return this.reservationsService.getEnrichedDetail(resNo);
  }

  @Get(':resNo')
  @ApiOperation({ summary: 'Get reservation by reservation number' })
  @ApiParam({ name: 'resNo', type: String })
  getByResNo(@Param('resNo') resNo: string) {
    return this.reservationsService.getByResNo(resNo);
  }
}
