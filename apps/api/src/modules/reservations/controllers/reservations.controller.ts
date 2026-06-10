import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
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

  @Get(':resNo')
  @ApiOperation({ summary: 'Get reservation by reservation number' })
  @ApiParam({ name: 'resNo', type: String })
  getByResNo(@Param('resNo') resNo: string) {
    return this.reservationsService.getByResNo(resNo);
  }
}
