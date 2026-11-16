# Política de segurança / Security policy

## Português

Se você encontrou uma vulnerabilidade, **não abra uma issue pública** e não inclua dados reais, credenciais ou informações de pessoas no relato.

Use **Security > Report a vulnerability** neste repositório (relato privado). Se possível, inclua:

- o que foi afetado e como reproduzir, com dados fictícios;
- o impacto observado e o potencial;
- evidências sem tokens, cookies ou dados pessoais.

Não acesse contas de terceiros, não cause indisponibilidade e não exfiltre dados para demonstrar o impacto.

### Segredos

Nenhum segredo entra no Git. Só a chave pública (`anon`) do Supabase é usada no navegador, e o acesso aos dados é protegido por RLS e por Edge Functions com rate limit. Chaves privilegiadas existem apenas como segredos do servidor. Se um segredo vazar, ele é revogado na hora, porque apagar o commit não é suficiente.

### Dependências

O projeto usa Dependabot e `npm audit`. Alertas conhecidos e aceitos de forma consciente ficam descritos no [README](README.md#segurança).

## English

If you found a vulnerability, **do not open a public issue** and do not include real data, credentials or personal information in your report.

Use **Security > Report a vulnerability** in this repository (private report). If possible, include what was affected, steps to reproduce with fictional data, observed and potential impact, and evidence without tokens, cookies or personal data.

Do not access other people's accounts, cause downtime or exfiltrate data to demonstrate impact.
