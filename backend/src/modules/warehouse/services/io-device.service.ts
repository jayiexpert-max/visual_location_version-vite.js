import { Injectable, NotFoundException } from '@nestjs/common';
import { EthernetIo } from '../../../entities/ethernet-io.entity';
import { CreateEthernetIoDto } from '../dto/create-ethernet-io.dto';
import { UpdateEthernetIoDto } from '../dto/update-ethernet-io.dto';
import { EthernetIoRepository } from '../repositories/ethernet-io.repository';

@Injectable()
export class IoDeviceService {
  constructor(private readonly ethernetIoRepository: EthernetIoRepository) {}

  findAll(): Promise<EthernetIo[]> {
    return this.ethernetIoRepository.findAll();
  }

  async findById(id: number): Promise<EthernetIo> {
    const device = await this.ethernetIoRepository.findById(id);

    if (!device) {
      throw new NotFoundException({
        message: `IO device ${id} not found`,
        code: 'IO_DEVICE_NOT_FOUND',
      });
    }

    return device;
  }

  create(dto: CreateEthernetIoDto): Promise<EthernetIo> {
    return this.ethernetIoRepository.create({
      name: dto.name,
      ipAddress: dto.ipAddress,
      port: dto.port ?? 80,
      controllerType: dto.controllerType ?? 'http',
      urlFormat:
        dto.urlFormat ??
        'http://{IP}:{PORT}/relay.cgi?relay={PIN}&state={STATE}',
      inputs: dto.inputs ?? 16,
      outputs: dto.outputs ?? 16,
    });
  }

  async update(id: number, dto: UpdateEthernetIoDto): Promise<EthernetIo> {
    await this.findById(id);
    const updated = await this.ethernetIoRepository.update(id, dto);

    if (!updated) {
      throw new NotFoundException({
        message: `IO device ${id} not found`,
        code: 'IO_DEVICE_NOT_FOUND',
      });
    }

    return updated;
  }

  async delete(id: number): Promise<void> {
    await this.findById(id);
    await this.ethernetIoRepository.delete(id);
  }
}
