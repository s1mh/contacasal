-- Somente para desenvolvimento local (executado por `supabase db reset`).
--
-- Na nuvem, o Supabase concede esses privilégios por padrão às tabelas novas.
-- No Postgres local do CLI isso nem sempre acontece, e as chamadas ficam com
-- "permission denied". O acesso de verdade continua protegido pelas políticas
-- de RLS definidas nas migrações; este arquivo só devolve o privilégio básico
-- que a plataforma já oferece em produção.

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
