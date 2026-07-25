import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../common/security/auth-metadata';
import { UsersService } from '../application/users.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('v1/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions('users:read:any')
  async list(@Query() query: ListUsersQueryDto) {
    return {
      data: await this.users.list(query.limit, query.offset),
      meta: { limit: query.limit, offset: query.offset },
    };
  }

  @Get(':id')
  @RequirePermissions('users:read:any')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.users.getPublicById(id) };
  }

  @Patch(':id')
  @RequirePermissions('users:update:any')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateUserDto,
  ) {
    return { data: await this.users.update(id, input) };
  }
}
