-- QuestDay: dados, histórico, lembretes push. Tudo prefixado qd_ para não tocar no Fluxo Previsto.
create table public.qd_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  device text,
  updated_at timestamptz not null default now()
);
comment on table public.qd_data is 'QuestDay: estado do app, uma linha por usuário.';

create table public.qd_backup (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  saved_at timestamptz not null default now()
);
create index qd_backup_user_idx on public.qd_backup(user_id, saved_at desc);
comment on table public.qd_backup is 'QuestDay: cópias anteriores (no máximo 1 a cada 6h, últimas 30 por usuário).';

create table public.qd_push_subs (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  device text,
  created_at timestamptz not null default now()
);
create index qd_push_subs_user_idx on public.qd_push_subs(user_id);

create table public.qd_reminders (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  fire_at timestamptz not null,
  title text not null,
  body text not null default '',
  tag text,
  sent_at timestamptz
);
create index qd_reminders_due_idx on public.qd_reminders(fire_at) where sent_at is null;
create index qd_reminders_user_idx on public.qd_reminders(user_id);

create table public.qd_ai_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text
);
comment on table public.qd_ai_access is 'QuestDay: quem pode usar o Lume com a chave do servidor (além da dona, via OWNER_ID).';

alter table public.qd_data enable row level security;
alter table public.qd_backup enable row level security;
alter table public.qd_push_subs enable row level security;
alter table public.qd_reminders enable row level security;
alter table public.qd_ai_access enable row level security;

create policy "qd_data: dono lê" on public.qd_data for select to authenticated using ((select auth.uid()) = user_id);
create policy "qd_data: dono cria" on public.qd_data for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "qd_data: dono atualiza" on public.qd_data for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "qd_data: dono apaga" on public.qd_data for delete to authenticated using ((select auth.uid()) = user_id);

create policy "qd_backup: dono lê" on public.qd_backup for select to authenticated using ((select auth.uid()) = user_id);

create policy "qd_push: dono lê" on public.qd_push_subs for select to authenticated using ((select auth.uid()) = user_id);
create policy "qd_push: dono cria" on public.qd_push_subs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "qd_push: dono atualiza" on public.qd_push_subs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "qd_push: dono apaga" on public.qd_push_subs for delete to authenticated using ((select auth.uid()) = user_id);

create policy "qd_rem: dono lê" on public.qd_reminders for select to authenticated using ((select auth.uid()) = user_id);
create policy "qd_rem: dono cria" on public.qd_reminders for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "qd_rem: dono apaga" on public.qd_reminders for delete to authenticated using ((select auth.uid()) = user_id);

create policy "qd_ai: dono lê" on public.qd_ai_access for select to authenticated using ((select auth.uid()) = user_id);

-- Histórico automático: guarda a versão anterior no máximo a cada 6h e mantém as 30 últimas.
create or replace function public.qd_keep_backup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.qd_backup b where b.user_id = old.user_id and b.saved_at > now() - interval '6 hours') then
    insert into public.qd_backup(user_id, data) values (old.user_id, old.data);
    delete from public.qd_backup where id in (
      select id from public.qd_backup where user_id = old.user_id order by saved_at desc offset 30);
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.qd_keep_backup() from public, anon, authenticated;
create trigger qd_data_backup before update on public.qd_data for each row execute function public.qd_keep_backup();

-- Troca, de uma vez, os lembretes futuros ainda não enviados (o app recalcula a cada mudança).
create or replace function public.qd_set_reminders(items jsonb) returns integer
language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); n integer;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  delete from public.qd_reminders where user_id = uid and (sent_at is null or sent_at < now() - interval '2 days');
  insert into public.qd_reminders(user_id, fire_at, title, body, tag)
  select uid, (x->>'at')::timestamptz, left(x->>'title', 120), left(coalesce(x->>'body', ''), 300), left(x->>'tag', 80)
  from jsonb_array_elements(coalesce(items, '[]'::jsonb)) x
  where (x->>'at')::timestamptz between now() - interval '1 minute' and now() + interval '3 days'
  limit 200;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.qd_set_reminders(jsonb) from public, anon;
grant execute on function public.qd_set_reminders(jsonb) to authenticated;
