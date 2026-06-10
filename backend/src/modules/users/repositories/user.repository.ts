import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  findByUsername(username: string): Promise<User | null> {
    return this.repository.findOne({ where: { username } });
  }

  findById(id: number): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  findAll(skip: number, take: number): Promise<[User[], number]> {
    return this.repository.findAndCount({
      order: { id: 'ASC' },
      skip,
      take,
    });
  }

  create(user: Partial<User>): User {
    return this.repository.create(user);
  }

  save(user: User): Promise<User> {
    return this.repository.save(user);
  }

  async remove(user: User): Promise<void> {
    await this.repository.remove(user);
  }
}
