import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../../common/security/auth-metadata';
import { UsersService } from '../../users';
import { AuthService } from '../application/auth.service';
import type { AuthenticatedUser } from '../domain/auth-user';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('auth')
@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Post('register')
  @Public()
  @ApiCreatedResponse({ description: 'Usuário criado' })
  async register(@Body() input: RegisterDto) {
    return { data: await this.users.register(input) };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Sessão criada' })
  async login(@Body() input: LoginDto) {
    return { data: await this.auth.login(input.email, input.password) };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() input: RefreshTokenDto) {
    return { data: await this.auth.refresh(input.refreshToken) };
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() input: RefreshTokenDto): Promise<void> {
    await this.auth.logout(input.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  async me(@CurrentUser() currentUser: AuthenticatedUser) {
    return { data: await this.users.getPublicById(currentUser.sub) };
  }

  @Patch('me')
  @ApiBearerAuth()
  async updateMe(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() input: UpdateProfileDto,
  ) {
    return { data: await this.users.update(currentUser.sub, input) };
  }
}
