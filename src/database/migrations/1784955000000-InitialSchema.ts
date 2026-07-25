import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1784955000000 implements MigrationInterface {
  name = 'InitialSchema1784955000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(320) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "role" varchar(32) NOT NULL DEFAULT 'user',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_users_email_normalized" ON "users" (lower("email"))',
    );

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" char(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "replaced_by_token_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "last_used_at" timestamptz,
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_refresh_tokens_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_refresh_tokens_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_refresh_tokens_replacement"
          FOREIGN KEY ("replaced_by_token_id") REFERENCES "refresh_tokens"("id")
          ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_refresh_tokens_expires_at" ON "refresh_tokens" ("expires_at")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."IDX_refresh_tokens_expires_at"',
    );
    await queryRunner.query('DROP INDEX "public"."IDX_refresh_tokens_user_id"');
    await queryRunner.query('DROP TABLE "refresh_tokens"');
    await queryRunner.query('DROP INDEX "public"."UQ_users_email_normalized"');
    await queryRunner.query('DROP TABLE "users"');
  }
}
