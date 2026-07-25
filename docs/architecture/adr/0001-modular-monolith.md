# ADR-0001: Monólito modular com fronteiras por domínio

**Status:** Accepted  
**Date:** 2026-07-25  
**Deciders:** mantenedor do projeto

## Context

Projeto começa sem carga comprovada, com foco em portfólio, entrega rápida, segurança,
testes e evolução. Autenticação, usuários e agregação possuem regras distintas, mas ainda
não justificam custo operacional distribuído.

## Decision

Usar NestJS como monólito modular. Deploy único; módulos `auth`, `users`,
`integrations`, `cache` e `health`; PostgreSQL como fonte de verdade; Redis como cache.
Separação futura exige evidência de escala, autonomia de equipe ou perfil operacional
incompatível.

## Options Considered

### Monólito modular

| Dimension        | Assessment             |
| ---------------- | ---------------------- |
| Complexity       | baixa                  |
| Cost             | baixo                  |
| Scalability      | horizontal por réplica |
| Team familiarity | alta                   |

**Pros:** transações simples, testes e deploy baratos, refatoração rápida.  
**Cons:** isolamento de falha limitado; disciplina necessária nas fronteiras.

### Microservices

| Dimension        | Assessment     |
| ---------------- | -------------- |
| Complexity       | alta           |
| Cost             | alto           |
| Scalability      | independente   |
| Team familiarity | não comprovada |

**Pros:** escala e deploy independentes.  
**Cons:** rede, observabilidade distribuída, consistência eventual, mais CI/CD.

## Trade-off Analysis

Escala independente não compensa custo atual. Monólito modular preserva opção de extração
se portas e ownership de dados forem respeitados.

## Consequences

- uma pipeline e um artefato de deploy;
- módulos precisam de testes de arquitetura contra imports indevidos;
- PostgreSQL e Redis permanecem dependências externas;
- filas/workers serão decididos após métricas reais.

## Action Items

1. [x] Criar módulos e health check.
2. [x] Criar Docker Compose e CI inicial.
3. [x] Implementar persistência via migrations.
4. [x] Criar testes automatizados de fronteiras.
