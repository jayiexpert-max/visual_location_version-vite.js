import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const entitiesPath = [
  join(__dirname, '..', 'entities', '*.{ts,js}'),
  join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}'),
];

export function createTypeOrmOptions(
  configService: ConfigService,
): TypeOrmModuleOptions {
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  return {
    type: 'mysql',
    host: configService.getOrThrow<string>('database.host'),
    port: configService.getOrThrow<number>('database.port'),
    username: configService.getOrThrow<string>('database.user'),
    password: configService.get<string>('database.password', ''),
    database: configService.getOrThrow<string>('database.name'),
    charset: configService.get<string>('database.charset', 'utf8mb4'),
    entities: entitiesPath,
    synchronize: false,
    autoLoadEntities: true,
    timezone: configService.get<string>('app.timezone', 'Asia/Bangkok'),
    logging: nodeEnv === 'development',
    extra: {
      connectionLimit: 10,
    },
  };
}
