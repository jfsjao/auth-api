import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserOrmEntity } from './infrastructure/persistence/user.orm-entity';
import { UsersModule } from './users.module';

describe('UsersModule', () => {
  it('exposes the users application service', async () => {
    const builder = Test.createTestingModule({
      imports: [UsersModule],
    });
    builder.overrideProvider(getRepositoryToken(UserOrmEntity)).useValue({});
    const moduleRef = await builder.compile();

    expect(() => moduleRef.get<unknown>('USERS_APPLICATION')).not.toThrow();
  });
});
