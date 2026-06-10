import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'material_code', type: 'varchar', length: 50, unique: true })
  materialCode: string;

  @Column({ name: 'description', type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark: string | null;
}
