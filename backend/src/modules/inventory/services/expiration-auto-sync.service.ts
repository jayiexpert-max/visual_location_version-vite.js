import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpirationSyncService } from './expiration-sync.service';

interface ScheduledTime {
  hour: number;
  minute: number;
}

const DEFAULT_TIME_ZONE = 'Asia/Bangkok';
const SCHEDULED_TIMES: ScheduledTime[] = [
  { hour: 6, minute: 0 },
  { hour: 18, minute: 0 },
];

@Injectable()
export class ExpirationAutoSyncService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ExpirationAutoSyncService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly expirationSyncService: ExpirationSyncService,
  ) {}

  onApplicationBootstrap(): void {
    this.scheduleNextRun();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNextRun(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const timeZone = this.getTimeZone();
    const nextRunAt = this.getNextScheduledRun(new Date(), timeZone);
    const delay = Math.max(0, nextRunAt.getTime() - Date.now());

    this.logger.log(
      `Next expiration auto-sync scheduled at ${nextRunAt.toISOString()} (${timeZone})`,
    );

    this.timer = setTimeout(() => {
      void this.runScheduledSync();
    }, delay);
  }

  private async runScheduledSync(): Promise<void> {
    if (this.running) {
      this.logger.warn('Skipping expiration auto-sync because a run is still in progress');
      this.scheduleNextRun();
      return;
    }

    this.running = true;
    const startedAt = new Date();

    try {
      this.logger.log('Starting expiration auto-sync');
      const result = await this.expirationSyncService.syncFromCentral();
      this.logger.log(
        `Expiration auto-sync finished with status=${result.status}, updated=${result.updated}, matched=${result.matched}, total=${result.total}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown expiration auto-sync error';
      this.logger.error(`Expiration auto-sync failed: ${message}`);
    } finally {
      this.running = false;
      this.logger.log(
        `Expiration auto-sync cycle completed in ${Date.now() - startedAt.getTime()} ms`,
      );
      this.scheduleNextRun();
    }
  }

  private getTimeZone(): string {
    return this.configService.get<string>('app.timezone') ?? DEFAULT_TIME_ZONE;
  }

  private getNextScheduledRun(now: Date, timeZone: string): Date {
    const currentWall = this.getZonedDateTimeParts(now, timeZone);
    if (!currentWall) {
      return new Date(now.getTime() + 60_000);
    }

    const todayCandidates = SCHEDULED_TIMES
      .map((time) =>
        this.zonedWallTimeToUtc(
          {
            year: currentWall.year,
            month: currentWall.month,
            day: currentWall.day,
            hour: time.hour,
            minute: time.minute,
          },
          timeZone,
        ),
      )
      .filter((candidate) => candidate.getTime() > now.getTime())
      .sort((a, b) => a.getTime() - b.getTime());

    if (todayCandidates.length > 0) {
      return todayCandidates[0];
    }

    const nextDay = this.addDays(currentWall, 1, timeZone);
    return this.zonedWallTimeToUtc(
      {
        year: nextDay.year,
        month: nextDay.month,
        day: nextDay.day,
        hour: SCHEDULED_TIMES[0].hour,
        minute: SCHEDULED_TIMES[0].minute,
      },
      timeZone,
    );
  }

  private addDays(
    wall: { year: number; month: number; day: number },
    days: number,
    timeZone: string,
  ): { year: number; month: number; day: number } {
    const utc = new Date(Date.UTC(wall.year, wall.month - 1, wall.day, 12, 0, 0));
    utc.setUTCDate(utc.getUTCDate() + days);
    const shifted = this.getZonedDateTimeParts(utc, timeZone);
    return (
      shifted ?? {
        year: wall.year,
        month: wall.month,
        day: wall.day + days,
      }
    );
  }

  private getZonedDateTimeParts(
    date: Date,
    timeZone: string,
  ): { year: number; month: number; day: number; hour: number; minute: number } | null {
    if (Number.isNaN(date.getTime())) return null;

    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);

    const get = (type: Intl.DateTimeFormatPartTypes): number => {
      const value = parts.find((part) => part.type === type)?.value;
      return Number.parseInt(value ?? '0', 10);
    };

    return {
      year: get('year'),
      month: get('month'),
      day: get('day'),
      hour: get('hour'),
      minute: get('minute'),
    };
  }

  private zonedWallTimeToUtc(
    wall: { year: number; month: number; day: number; hour: number; minute: number },
    timeZone: string,
  ): Date {
    const base = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, 0);
    let guess = new Date(base);

    for (let i = 0; i < 3; i += 1) {
      const offset = this.getTimeZoneOffsetMinutes(guess, timeZone);
      const adjusted = new Date(base - offset * 60_000);
      if (adjusted.getTime() === guess.getTime()) {
        return adjusted;
      }
      guess = adjusted;
    }

    return guess;
  }

  private getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    }).formatToParts(date);

    const tzName = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+0';
    const match = tzName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!match) {
      return 0;
    }

    const sign = match[1] === '+' ? 1 : -1;
    const hours = Number.parseInt(match[2] ?? '0', 10);
    const minutes = Number.parseInt(match[3] ?? '0', 10);
    return sign * (hours * 60 + minutes);
  }
}
