import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/security/auth-metadata';

@ApiTags('health')
@Controller('v1/health')
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Verifica se processo está ativo' })
  @ApiOkResponse({
    schema: {
      example: { status: 'ok', service: 'auth_api' },
    },
  })
  check(): { status: 'ok'; service: 'auth_api' } {
    return { status: 'ok', service: 'auth_api' };
  }
}
