import { PartialType } from '@nestjs/swagger';
import { CreateEthernetIoDto } from './create-ethernet-io.dto';

export class UpdateEthernetIoDto extends PartialType(CreateEthernetIoDto) {}
