import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from '../../../entities/app-setting.entity';
import { AppSettingsLog } from '../../../entities/app-settings-log.entity';

@Injectable()
export class AppSettingRepository {
  constructor(
    @InjectRepository(AppSetting)
    private readonly repository: Repository<AppSetting>,
  ) {}

  findByKey(key: string): Promise<AppSetting | null> {
    return this.repository.findOne({ where: { settingKey: key } });
  }

  async upsert(
    key: string,
    value: string,
    userId: number | null,
  ): Promise<AppSetting> {
    await this.repository.upsert(
      {
        settingKey: key,
        settingValue: value,
        updatedBy: userId,
      },
      ['settingKey'],
    );
    return (await this.findByKey(key))!;
  }

  async insertLog(
    key: string,
    oldValue: string,
    newValue: string,
    userId: number | null,
  ): Promise<void> {
    const logRepo = this.repository.manager.getRepository(AppSettingsLog);
    await logRepo.insert({
      settingKey: key,
      oldValue,
      newValue,
      changedBy: userId,
    });
  }
}
