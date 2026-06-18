import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { CpkService } from './cpk.service';
import { BookingOutPuidDto } from './dto/booking-out-puid.dto';
import { ClearCacheDto } from './dto/clear-cache.dto';
import { ClosePicklistDto } from './dto/close-picklist.dto';
import { CpkResponseDto } from './dto/cpk-response.dto';
import { GetPicklistDetailDto } from './dto/get-picklist-detail.dto';
import { IssuePuidToPicklistDto } from './dto/issue-puid-to-picklist.dto';
import { ResPuidRecvDto } from './dto/res-puid-recv.dto';
import { StationInvenCheckDto } from './dto/station-inven-check.dto';
import { UpdatePuidStatusDto } from './dto/update-puid-status.dto';
import { PicklistIssueService } from './picklist-issue.service';
import { BookingOutPreviewService } from './booking-out-preview.service';
import { HighlightGateway } from '../realtime/highlight.gateway';

@ApiTags('cpk')
@ApiBearerAuth('access-token')
@Controller('cpk')
export class CpkController {
  constructor(
    private readonly cpkService: CpkService,
    private readonly picklistIssueService: PicklistIssueService,
    private readonly bookingOutPreviewService: BookingOutPreviewService,
    private readonly highlightGateway: HighlightGateway,
  ) {}

  @Get('version')
  @ApiOperation({ summary: 'Get CPK service version (GetVersion)' })
  getVersion(): Promise<CpkResponseDto | string> {
    return this.cpkService.getVersion();
  }

  @Get('reservations/:keyword')
  @ApiOperation({ summary: 'Get reservation info by keyword (GET_RESNoInfo)' })
  @ApiParam({ name: 'keyword', description: 'Reservation number or keyword' })
  getResNoInfo(@Param('keyword') keyword: string): Promise<CpkResponseDto> {
    return this.cpkService.getResNoInfo(keyword);
  }

  @Post('public-uid')
  @ApiOperation({
    summary: 'Obtain CPK PublicUID token (GetPublicUID with McID + StationKey)',
  })
  getPublicUid(): Promise<CpkResponseDto> {
    return this.cpkService.getPublicUid(true);
  }

  @Post('reservations/receive')
  @ApiOperation({ summary: 'Receive PUID against reservation (RES_PUIDRecv)' })
  resPuidRecv(@Body() dto: ResPuidRecvDto): Promise<CpkResponseDto> {
    return this.cpkService.resPuidRecv(dto);
  }

  @Post('puid/return')
  @ApiOperation({ summary: 'Update PUID status for return (UpdatePUIDStatus)' })
  updatePuidStatus(@Body() dto: UpdatePuidStatusDto): Promise<CpkResponseDto> {
    return this.cpkService.updatePuidStatus(dto);
  }

  @Post('picklists/open')
  @ApiOperation({ summary: 'Get open picklists (GetOpenPicklists)' })
  getOpenPicklists(
    @Body() body: Record<string, unknown> = {},
  ): Promise<CpkResponseDto> {
    return this.cpkService.getOpenPicklists(body);
  }

  @Post('picklists/detail')
  @ApiOperation({ summary: 'Get picklist detail (GetPicklistDetail)' })
  getPicklistDetail(
    @Body() dto: GetPicklistDetailDto,
  ): Promise<CpkResponseDto> {
    return this.cpkService.getPicklistDetail(dto);
  }

  @Post('picklists/issue')
  @ApiOperation({ summary: 'Issue PUID to picklist (IssuePUIDToPicklist)' })
  issuePuidToPicklist(
    @Body() dto: IssuePuidToPicklistDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CpkResponseDto> {
    return this.picklistIssueService.issuePuid(
      dto.picklistId,
      dto.puid,
      dto.operator,
      user,
    );
  }

  @Post('picklists/close')
  @ApiOperation({ summary: 'Close picklist (ClosePicklist)' })
  async closePicklist(@Body() dto: ClosePicklistDto): Promise<CpkResponseDto> {
    const result = await this.cpkService.closePicklist(dto);
    this.highlightGateway.emitPicklistUpdate({
      picklistId: dto.picklistId.trim(),
      action: 'close',
      operator: dto.operator?.trim(),
      timestamp: new Date().toISOString(),
    });
    return result;
  }

  @Post('station/inventory')
  @ApiOperation({ summary: 'Station inventory check (StationInvenCheck)' })
  stationInvenCheck(
    @Body() dto: StationInvenCheckDto,
  ): Promise<CpkResponseDto> {
    return this.cpkService.stationInvenCheck(dto);
  }

  @Get('booking-out/preview')
  @Roles('admin', 'manage', 'material_prep')
  @ApiOperation({ summary: 'Preview PUID for booking out (PDService + local + CPK station)' })
  bookingOutPreview(@Query('puid') puid: string) {
    return this.bookingOutPreviewService.preview(puid);
  }

  @Post('booking-out')
  @Roles('admin', 'manage', 'material_prep')
  @ApiOperation({ summary: 'Booking out PUID from local stock (BookingOutPUID)' })
  bookingOutPuid(@Body() dto: BookingOutPuidDto): Promise<CpkResponseDto> {
    return this.cpkService.bookingOutPuid(dto);
  }

  @Post('cache/clear')
  @Roles('admin')
  @ApiOperation({ summary: 'Clear CPK server cache (ClearCache, admin only)' })
  clearCache(@Body() dto: ClearCacheDto): Promise<CpkResponseDto> {
    return this.cpkService.clearCache(dto);
  }
}
