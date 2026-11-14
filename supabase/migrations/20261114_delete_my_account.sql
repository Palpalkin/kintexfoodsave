-- Право на удаление данных (152-ФЗ): пользователь удаляет аккаунт и свои пространства одной кнопкой.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, storage, auth
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  delete from storage.objects
   where bucket_id = 'foodsave-photos'
     and (storage.foldername(name))[1] in (select id::text from public.spaces where owner_id = uid);
  delete from auth.users where id = uid;
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
