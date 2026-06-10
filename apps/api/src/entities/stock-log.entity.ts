import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { User } from './user.entity';

@Entity('stock_logs')
export class StockLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id', type: 'int' })
  productId: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'action', type: 'varchar', length: 255 })
  action: string;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark: string | null;

  @ManyToOne(() => Product, (product) => product.stockLogs, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => User, (user) => user.stockLogs, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
