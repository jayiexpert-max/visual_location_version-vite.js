import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../../users/repositories/user.repository';
import {
  APP_SETTING_FIFO_DUMMY_IM,
  APP_SETTING_FIFO_ISSUE_MODE,
  DEFAULT_FIFO_DUMMY_IM,
  FIFO_ISSUE_MODE_EXPIRATION,
  fifoIssueModeLabel,
  isValidFifoIssueMode,
} from '../constants/fifo-settings.constants';
import { AppSettingRepository } from '../repositories/app-setting.repository';

export interface FifoSettingsResponse {
  fifoIssueMode: string;
  fifoDummyIm: string;
  fifoIssueModeLabel: string;
  updatedAt: string | null;
  updatedByUsername: string | null;
}

@Injectable()
export class AppSettingsService implements OnModuleInit {
  private cache = new Map<string, string>();

  constructor(
    private readonly appSettingRepository: AppSettingRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureDefaults();
  }

  async ensureDefaults(): Promise<void> {
    const defaults: Record<string, string> = {
      [APP_SETTING_FIFO_ISSUE_MODE]: FIFO_ISSUE_MODE_EXPIRATION,
      [APP_SETTING_FIFO_DUMMY_IM]: DEFAULT_FIFO_DUMMY_IM,
    };

    for (const [key, value] of Object.entries(defaults)) {
      const existing = await this.appSettingRepository.findByKey(key);
      if (!existing) {
        await this.appSettingRepository.upsert(key, value, null);
      }
      this.cache.set(key, existing?.settingValue?.trim() || value);
    }
  }

  async get(key: string, defaultValue = ''): Promise<string> {
    if (this.cache.has(key)) {
      const cached = this.cache.get(key)!;
      return cached !== '' ? cached : defaultValue;
    }

    const row = await this.appSettingRepository.findByKey(key);
    const value = row?.settingValue?.trim() ?? '';
    const resolved = value !== '' ? value : defaultValue;
    this.cache.set(key, resolved);
    return resolved;
  }

  getFifoIssueMode(): Promise<string> {
    return this.get(APP_SETTING_FIFO_ISSUE_MODE, FIFO_ISSUE_MODE_EXPIRATION);
  }

  getFifoDummyImMarker(): Promise<string> {
    return this.get(APP_SETTING_FIFO_DUMMY_IM, DEFAULT_FIFO_DUMMY_IM);
  }

  async isDummyBatchIm(im: string | null | undefined): Promise<boolean> {
    const marker = (await this.getFifoDummyImMarker()).trim();
    if (!marker) return false;
    const value = (im ?? '').trim();
    if (!value) return false;
    return value.toUpperCase().includes(marker.toUpperCase());
  }

  async getFifoSettings(isEn = true): Promise<FifoSettingsResponse> {
    await this.ensureDefaults();
    const modeRow = await this.appSettingRepository.findByKey(
      APP_SETTING_FIFO_ISSUE_MODE,
    );
    const dummyRow = await this.appSettingRepository.findByKey(
      APP_SETTING_FIFO_DUMMY_IM,
    );

    const mode =
      modeRow?.settingValue?.trim() || FIFO_ISSUE_MODE_EXPIRATION;
    const dummyIm =
      dummyRow?.settingValue?.trim() || DEFAULT_FIFO_DUMMY_IM;

    let updatedByUsername: string | null = null;
    if (modeRow?.updatedBy) {
      const user = await this.userRepository.findById(modeRow.updatedBy);
      updatedByUsername = user?.username ?? null;
    }

    return {
      fifoIssueMode: isValidFifoIssueMode(mode)
        ? mode
        : FIFO_ISSUE_MODE_EXPIRATION,
      fifoDummyIm: dummyIm,
      fifoIssueModeLabel: fifoIssueModeLabel(mode, isEn),
      updatedAt: modeRow?.updatedAt
        ? modeRow.updatedAt.toISOString()
        : null,
      updatedByUsername,
    };
  }

  async updateFifoSettings(
    userId: number,
    fifoIssueMode: string,
    fifoDummyIm: string,
    confirmPassword: string,
  ): Promise<FifoSettingsResponse> {
    if (!isValidFifoIssueMode(fifoIssueMode)) {
      throw new BadRequestException({
        message: 'Invalid issue mode',
        code: 'FIFO_INVALID_MODE',
      });
    }

    const dummy = fifoDummyIm.trim().toUpperCase();
    if (!dummy) {
      throw new BadRequestException({
        message: 'Dummy Batch IM marker is required',
        code: 'FIFO_DUMMY_IM_REQUIRED',
      });
    }

    await this.verifyUserPassword(userId, confirmPassword);

    await this.set(APP_SETTING_FIFO_ISSUE_MODE, fifoIssueMode, userId);
    await this.set(APP_SETTING_FIFO_DUMMY_IM, dummy, userId);

    return this.getFifoSettings();
  }

  private async set(
    key: string,
    value: string,
    userId: number | null,
  ): Promise<void> {
    const old = await this.get(key, '');
    if (old === value) return;

    await this.appSettingRepository.upsert(key, value, userId);
    await this.appSettingRepository.insertLog(key, old, value, userId);
    this.cache.set(key, value);
  }

  private async verifyUserPassword(
    userId: number,
    password: string,
  ): Promise<void> {
    if (userId <= 0) {
      throw new UnauthorizedException({
        message: 'Invalid user session',
        code: 'AUTH_INVALID_SESSION',
      });
    }

    const user = await this.userRepository.findById(userId);
    if (!user?.password) {
      throw new UnauthorizedException({
        message: 'Incorrect password',
        code: 'AUTH_INVALID_CREDENTIALS',
      });
    }

    const matches = await bcrypt.compare(
      password,
      user.password.replace(/^\$2y\$/, '$2a$'),
    );

    if (!matches) {
      throw new UnauthorizedException({
        message: 'Incorrect password',
        code: 'AUTH_INVALID_CREDENTIALS',
      });
    }
  }
}
