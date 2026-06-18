import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AskAbdulDto {
  @ApiProperty({ example: '8041ISTC150J101 อยู่ไหน' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question!: string;
}
