import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import configuration from './config/configuration';
import { validateConfig } from './config/validation.schema';
import { DatabaseModule } from './database/database.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { CpkModule } from './modules/cpk/cpk.module';
import { PdserviceModule } from './modules/pdservice/pdservice.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TvModule } from './modules/tv/tv.module';
import { IoModule } from './modules/io/io.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateConfig,
      expandVariables: true,
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.accessSecret'),
        signOptions: {
          expiresIn: configService.get<string>(
            'jwt.accessExpiresIn',
            '4h',
          ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    WarehouseModule,
    InventoryModule,
    ReservationsModule,
    CpkModule,
    PdserviceModule,
    ReportsModule,
    TvModule,
    IoModule,
    RealtimeModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
