import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('tv_highlights')
@Index('idx_tv_highlight_expires', ['expiresAt'])
@Index('idx_tv_highlight_box', ['boxId'])
export class TvHighlight {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ name: 'product_name', type: 'varchar', length: 255, nullable: true })
  productName: string | null;

  @Column({ name: 'puid', type: 'varchar', length: 64, nullable: true })
  puid: string | null;

  @Column({ name: 'box_id', type: 'int' })
  boxId: number;

  @Column({ name: 'slot_id', type: 'int', nullable: true })
  slotId: number | null;

  @Column({ name: 'slot_no', type: 'int', nullable: true })
  slotNo: number | null;

  @Column({ name: 'rack_name', type: 'varchar', length: 50, nullable: true })
  rackName: string | null;

  @Column({ name: 'level_no', type: 'int', nullable: true })
  levelNo: number | null;

  @Column({ name: 'box_code', type: 'varchar', length: 50, nullable: true })
  boxCode: string | null;

  @Column({ name: 'qty', type: 'int', default: 0 })
  qty: number;

  @Column({ name: 'searched_by', type: 'varchar', length: 100, nullable: true })
  searchedBy: string | null;

  @Column({ name: 'highlight_seq', type: 'varchar', length: 64, unique: true })
  highlightSeq: string;

  @Column({ name: 'action_type', type: 'varchar', length: 32, default: 'highlight' })
  actionType: string;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
