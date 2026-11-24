-- Pré-requisito (feito uma vez, fora do git): chaves no Vault
--   select vault.create_secret('<vapid private>', 'qd_vapid_private');
--   select vault.create_secret('<vapid public>',  'qd_vapid_public');
--   select vault.create_secret('<segredo aleatório>', 'qd_cron_secret');
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- Só o servidor (service_role) lê as chaves do push.
create or replace function public.qd_push_cfg() returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_object_agg(name, decrypted_secret) from vault.decrypted_secrets
  where name in ('qd_vapid_private', 'qd_vapid_public', 'qd_cron_secret');
$$;
revoke execute on function public.qd_push_cfg() from public, anon, authenticated;
grant execute on function public.qd_push_cfg() to service_role;

-- A cada minuto o banco chama a função que envia os lembretes vencidos (só se houver algum).
select cron.schedule('qd-push-every-minute', '* * * * *', $$
  select net.http_post(
    url := 'https://ziycnzsjhnswwrpotasp.supabase.co/functions/v1/qd-push',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'qd_cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 20000)
  where exists (select 1 from public.qd_reminders where sent_at is null and fire_at <= now() + interval '30 seconds');
$$);
