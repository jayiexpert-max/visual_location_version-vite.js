import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditCategory } from '../../entities/audit-log.entity';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth('access-token')
@Controller('audit')
@Roles('manage')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Recent audit log entries (admin)' })
  logs(
    @Query('category') category?: AuditCategory,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findRecent({
      category,
      action,
      userId: userId ? Number(userId) : undefined,
      limit: limit ? Number(limit) : 200,
    });
  }
}
