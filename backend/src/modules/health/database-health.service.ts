import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseHealthService {
  constructor(private readonly dataSource: DataSource) {}

  async check() {
    const startedAt = Date.now();

    try {
      await this.dataSource.query('SELECT 1 AS ok');
      return {
        status: 'ok',
        latencyMs: Date.now() - startedAt,
        connected: this.dataSource.isInitialized,
      };
    } catch (error) {
      return {
        status: 'error',
        latencyMs: Date.now() - startedAt,
        connected: false,
        message: error instanceof Error ? error.message : 'Database unreachable',
      };
    }
  }
}
