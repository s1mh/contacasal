# Contribuindo

## Branching

Leia primeiro: `docs/REPO_WORKFLOW.md`

Resumo:

- Produção web: `main`
- Prefixos: `feat/*`, `fix/*`, `chore/*`, `docs/*`, `hotfix/*`
- Preferir PRs pequenos e focados
- Deletar branch após merge

## Commits

- Mensagens descritivas e curtas
- Evitar commitar credenciais (.env, tokens, etc.)

## Checklist de PR

- `npm run build` local
- Sem secrets em arquivos
- Se mexer em schema/migrations: explicar impacto e rollback

