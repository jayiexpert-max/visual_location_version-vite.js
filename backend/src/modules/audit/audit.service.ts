import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditCategory,
  AuditLog,
  AuditStatus,
} from '../../entities/audit-log.entity';

export interface AuditLogParams {
  action: string;
  category: AuditCategory;
  userId?: number | null;
  username?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
  status?: AuditStatus;
}

export interface AuditLogQuery {
  category?: AuditCategory;
  action?: string;
  userId?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.auditRepository.save(
        this.auditRepository.create({
          action: params.action,
          category: params.category,
          userId: params.userId ?? null,
          username: params.username ?? null,
          resourceType: params.resourceType ?? null,
          resourceId: params.resourceId ?? null,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          detailsJson: params.details ?? null,
          status: params.status ?? AuditStatus.Success,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to write audit_logs: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async findRecent(query: AuditLogQuery = {}): Promise<AuditLog[]> {
    const qb = this.auditRepository
      .createQueryBuilder('audit')
      .orderBy('audit.created_at', 'DESC')
      .take(query.limit ?? 100);

    if (query.category) {
      qb.andWhere('audit.category = :category', { category: query.category });
    }
    if (query.action) {
      qb.andWhere('audit.action = :action', { action: query.action });
    }
    if (query.userId) {
      qb.andWhere('audit.user_id = :userId', { userId: query.userId });
    }

    return qb.getMany();
  }
}
