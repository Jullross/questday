-- "Recomeçar do zero": guarda a versão atual nas versões anteriores e apaga os dados do QuestDay da pessoa logada.
create or replace function public.qd_reset() returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  insert into public.qd_backup(user_id, data) select user_id, data from public.qd_data where user_id = uid;
  delete from public.qd_backup where id in (select id from public.qd_backup where user_id = uid order by saved_at desc offset 30);
  delete from public.qd_reminders where user_id = uid and sent_at is null;
  delete from public.qd_data where user_id = uid;
  return true;
end $$;
revoke execute on function public.qd_reset() from public, anon;
grant execute on function public.qd_reset() to authenticated;
