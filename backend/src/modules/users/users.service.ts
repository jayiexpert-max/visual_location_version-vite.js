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
import { AuditCategory } from '../../entities/audit-log.entity';
import { User, UserLang } from '../../entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { UserRepository } from './repositories/user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

export interface UserActorContext {
  userId: number;
  username: string;
}

@Injectable()
export class UsersService {
  private static readonly BCRYPT_ROUNDS = 12;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditService: AuditService,
  ) {}

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

  async create(
    dto: CreateUserDto,
    actor?: UserActorContext,
  ): Promise<UserResponseDto> {
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

    await this.auditService.log({
      action: 'user_create',
      category: AuditCategory.User,
      userId: actor?.userId ?? null,
      username: actor?.username ?? null,
      resourceType: 'user',
      resourceId: String(saved.id),
      details: { username: saved.username, role: saved.role },
    });

    return UserResponseDto.fromEntity(saved);
  }

  async update(
    id: number,
    dto: UpdateUserDto,
    actor?: UserActorContext,
  ): Promise<UserResponseDto> {
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

    await this.auditService.log({
      action: 'user_update',
      category: AuditCategory.User,
      userId: actor?.userId ?? null,
      username: actor?.username ?? null,
      resourceType: 'user',
      resourceId: String(saved.id),
      details: {
        username: saved.username,
        role: saved.role,
        passwordChanged: dto.password !== undefined,
      },
    });

    return UserResponseDto.fromEntity(saved);
  }

  async remove(id: number, actor?: UserActorContext): Promise<void> {
    const user = await this.requireUser(id);
    await this.userRepository.remove(user);

    await this.auditService.log({
      action: 'user_delete',
      category: AuditCategory.User,
      userId: actor?.userId ?? null,
      username: actor?.username ?? null,
      resourceType: 'user',
      resourceId: String(user.id),
      details: { username: user.username },
    });
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
