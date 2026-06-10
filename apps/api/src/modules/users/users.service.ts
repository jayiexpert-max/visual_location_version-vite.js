import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  buildPaginatedResult,
  getPaginationSkip,
  PaginationDto,
  type PaginatedResult,
} from '../../common/dto/pagination.dto';
import { User, UserLang } from '../../entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  private static readonly BCRYPT_ROUNDS = 12;

  constructor(private readonly userRepository: UserRepository) {}

  async findAll(
    pagination: PaginationDto,
  ): Promise<PaginatedResult<UserResponseDto>> {
    const skip = getPaginationSkip(pagination);
    const [users, total] = await this.userRepository.findAll(
      skip,
      pagination.limit,
    );

    return buildPaginatedResult(
      users.map((user) => UserResponseDto.fromEntity(user)),
      total,
      pagination,
    );
  }

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.requireUser(id);
    return UserResponseDto.fromEntity(user);
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    await this.assertUsernameAvailable(dto.username);

    const passwordHash = await bcrypt.hash(
      dto.password,
      UsersService.BCRYPT_ROUNDS,
    );

    const user = this.userRepository.create({
      username: dto.username,
      password: passwordHash,
      role: dto.role,
      lang: dto.lang ?? UserLang.Th,
      email: dto.email ?? null,
      remark: dto.remark ?? null,
    });

    const saved = await this.userRepository.save(user);
    return UserResponseDto.fromEntity(saved);
  }

  async update(id: number, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.requireUser(id);

    if (dto.username !== undefined && dto.username !== user.username) {
      await this.assertUsernameAvailable(dto.username, id);
      user.username = dto.username;
    }

    if (dto.password !== undefined) {
      user.password = await bcrypt.hash(
        dto.password,
        UsersService.BCRYPT_ROUNDS,
      );
    }

    if (dto.role !== undefined) {
      user.role = dto.role;
    }

    if (dto.lang !== undefined) {
      user.lang = dto.lang;
    }

    if (dto.email !== undefined) {
      user.email = dto.email;
    }

    if (dto.remark !== undefined) {
      user.remark = dto.remark;
    }

    const saved = await this.userRepository.save(user);
    return UserResponseDto.fromEntity(saved);
  }

  async remove(id: number): Promise<void> {
    const user = await this.requireUser(id);
    await this.userRepository.remove(user);
  }

  private async requireUser(id: number): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException({
        message: `User ${id} not found`,
        code: 'USER_NOT_FOUND',
      });
    }

    return user;
  }

  private async assertUsernameAvailable(
    username: string,
    excludeUserId?: number,
  ): Promise<void> {
    const existing = await this.userRepository.findByUsername(username);
    if (existing && existing.id !== excludeUserId) {
      throw new ConflictException({
        message: `Username "${username}" is already taken`,
        code: 'USER_USERNAME_CONFLICT',
      });
    }
  }
}
