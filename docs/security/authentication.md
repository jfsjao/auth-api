# Autenticação e autorização

## Fluxo

1. Cadastro normaliza e-mail e cria usuário `user`.
2. Senha recebe hash Argon2id antes da persistência.
3. Login valida credenciais e emite access token JWT + refresh token opaco.
4. Access token autoriza requisições via `Authorization: Bearer`.
5. Refresh token é rotacionado a cada uso.
6. Logout revoga refresh token.

## Access token

- JWT HS256;
- duração padrão: 15 minutos;
- `issuer` e `audience` obrigatórios;
- algoritmo permitido fixado em `HS256`;
- claims: `sub`, `email`, `role`, `permissions`, `iat`, `exp`.

## Refresh token

- 48 bytes aleatórios codificados em Base64URL;
- duração padrão: 7 dias;
- banco armazena HMAC-SHA-256, nunca token original;
- pepper separado do segredo JWT;
- rotação transacional com lock pessimista;
- reutilização revoga tokens ativos do usuário.

## Senhas

- Argon2id;
- mínimo de 12, máximo de 128 caracteres;
- parâmetros configurados por ambiente;
- hashes e senhas nunca retornam nos contratos HTTP.

## Autorização

Roles iniciais:

- `user`: leitura e atualização do próprio perfil;
- `admin`: permissões do usuário e administração de usuários.

Permissões:

- `profile:read:self`;
- `profile:update:self`;
- `users:read:any`;
- `users:update:any`.

Rotas administrativas usam `@RequirePermissions`. Guards globais validam JWT e
permissões. Rotas públicas exigem marcação explícita com `@Public`.

## Limitações conhecidas

- refresh token trafega em JSON para suportar clientes web, mobile e server-to-server;
- clientes web devem armazená-lo com proteção adequada; cookie HttpOnly poderá ser
  adicionado como transporte alternativo;
- recuperação de senha, MFA e confirmação de e-mail ficam para evolução futura.
