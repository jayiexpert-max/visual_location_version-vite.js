import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Rack } from './rack.entity';
import { Box } from './box.entity';

@Entity('levels')
export class Level {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'rack_id', type: 'int', nullable: true })
  rackId: number | null;

  @Column({ name: 'level_no', type: 'int', nullable: true })
  levelNo: number | null;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark: string | null;

  @ManyToOne(() => Rack, (rack) => rack.levels, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'rack_id' })
  rack: Rack | null;

  @OneToMany(() => Box, (box) => box.level)
  boxes: Box[];
}
