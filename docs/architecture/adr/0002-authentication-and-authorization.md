# ADR-0002: Estratégia de autenticação, sessões e autorização

**Status:** Accepted  
**Date:** 2026-07-25  
**Deciders:** mantenedor do projeto

## Context

A API precisa autenticar clientes web, mobile e server-to-server sem introduzir estado de
sessão em memória. Access tokens devem ter validação rápida, enquanto sessões precisam de
revogação, rotação e detecção de reutilização. Senhas e tokens persistidos são ativos
sensíveis.

Restrições:

- aplicação inicialmente distribuída como monólito modular;
- PostgreSQL como fonte de verdade;
- múltiplas sessões por usuário;
- API REST reutilizável por diferentes clientes;
- roles e permissões ainda estáveis e pouco numerosas;
- segurança sem infraestrutura adicional obrigatória.

## Decision

Adotar:

- access token JWT HS256 com validade padrão de 15 minutos;
- validação obrigatória de assinatura, algoritmo, `issuer`, `audience` e expiração;
- refresh token opaco com 48 bytes aleatórios e validade padrão de 7 dias;
- persistência somente do HMAC-SHA-256 do refresh token, usando pepper separado;
- rotação transacional com lock pessimista a cada refresh;
- detecção de reutilização, revogando tokens ativos do usuário;
- logout por revogação do refresh token;
- Argon2id para hashing de senhas;
- RBAC com roles `user` e `admin`;
- permissões definidas em código e aplicadas por guards globais;
- rotas públicas marcadas explicitamente com `@Public`;
- refresh token transportado em JSON nesta fase.

## Options Considered

### JWT curto + refresh token opaco

| Dimension            | Assessment              |
| -------------------- | ----------------------- |
| Complexity           | média                   |
| Cost                 | baixo                   |
| Scalability          | alta para access tokens |
| Revocation           | controlada no refresh   |
| Client compatibility | alta                    |

**Pros:** access token sem consulta ao banco; refresh revogável; reutilização detectável;
compatível com diferentes clientes.  
**Cons:** exige tabela, rotação transacional e proteção do refresh token no cliente.

### JWT para access e refresh tokens

| Dimension            | Assessment |
| -------------------- | ---------- |
| Complexity           | baixa      |
| Cost                 | baixo      |
| Scalability          | alta       |
| Revocation           | difícil    |
| Client compatibility | alta       |

**Pros:** implementação simples; validação independente de banco.  
**Cons:** revogação exige denylist ou espera da expiração; rotação e detecção de
reutilização ficam mais complexas; claims permanecem legíveis.

### Sessão opaca completa no servidor

| Dimension            | Assessment               |
| -------------------- | ------------------------ |
| Complexity           | média                    |
| Cost                 | médio                    |
| Scalability          | depende do armazenamento |
| Revocation           | simples                  |
| Client compatibility | média                    |

**Pros:** revogação imediata; pouco dado exposto ao cliente; controle central.  
**Cons:** consulta ao armazenamento em toda requisição; Redis altamente disponível passa a
ser dependência crítica; maior custo operacional inicial.

## Trade-off Analysis

JWT curto reduz consultas durante autorização, mas não permite revogação instantânea do
access token já emitido. Validade curta limita essa janela.

Refresh token opaco adiciona estado no PostgreSQL, porém permite rotação, logout e
detecção de roubo sem expor claims. HMAC com pepper protege tokens caso somente o banco
seja comprometido.

HS256 mantém operação simples no monólito atual. Migração para assinatura assimétrica será
reavaliada quando serviços independentes precisarem validar tokens sem compartilhar segredo.

Permissões em código evitam tabelas e administração dinâmica prematuras. Modelo persistido
será considerado se permissões precisarem mudar sem deploy.

JSON atende clientes variados. Aplicações web deverão proteger o refresh token; cookie
`HttpOnly`, `Secure` e `SameSite` poderá ser adicionado como transporte alternativo.

## Consequences

- autorização de access tokens não consulta banco;
- revogação completa do access token pode levar até 15 minutos;
- PostgreSQL participa do login, refresh e logout;
- refresh simultâneo é serializado por lock pessimista;
- comprometimento do refresh token pode ser identificado por reutilização;
- troca do pepper invalida todas as sessões;
- alteração de roles/permissões exige novo login ou refresh para refletir no JWT;
- clientes são responsáveis por armazenamento seguro do refresh token;
- confirmação de e-mail, recuperação de senha e MFA permanecem decisões futuras.

## Action Items

1. [x] Implementar Argon2id para senhas.
2. [x] Implementar access token JWT com algoritmo fixo, issuer e audience.
3. [x] Implementar refresh token opaco com HMAC e rotação transacional.
4. [x] Implementar detecção de reutilização e logout.
5. [x] Implementar roles, permissões e guards globais.
6. [x] Cobrir autenticação e autorização com testes unitários, E2E e integração.
7. [ ] Avaliar cookie HttpOnly para clientes web.
8. [ ] Reavaliar HS256 quando houver validadores externos independentes.
9. [ ] Projetar recuperação de senha, confirmação de e-mail e MFA.
