-- Виджет для iPhone (Scriptable): личный токен только для чтения сводки. Хранится только sha256-хэш токена.
create table if not exists public.widget_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);
alter table public.widget_tokens enable row level security;
revoke all on public.widget_tokens from anon, authenticated;

create or replace function public.create_widget_token() returns text
language plpgsql security definer set search_path = '' as $$
declare tok text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  tok := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.widget_tokens(user_id, token_hash) values (auth.uid(), encode(extensions.digest(tok, 'sha256'), 'hex'))
  on conflict (user_id) do update set token_hash = excluded.token_hash, created_at = now();
  return tok;
end $$;

create or replace function public.revoke_widget_token() returns void
language sql security definer set search_path = '' as $$
  delete from public.widget_tokens where user_id = auth.uid();
$$;

create or replace function public.has_widget_token() returns boolean
language sql security definer stable set search_path = '' as $$
  select exists (select 1 from public.widget_tokens where user_id = auth.uid());
$$;

-- Сводка для виджета. Невалидный токен → null. Возвращает только счётчики и ближайшие сроки.
create or replace function public.widget_summary(p_token text) returns jsonb
language plpgsql security definer stable set search_path = '' as $$
declare uid uuid; res jsonb;
begin
  if p_token is null or length(p_token) <> 48 then return null; end if;
  select user_id into uid from public.widget_tokens where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if uid is null then return null; end if;
  with sp as (select space_id from public.space_members where user_id = uid),
  act as (select name, expires_on from public.products where space_id in (select space_id from sp) and status = 'active'),
  gone as (select status from public.products where space_id in (select space_id from sp) and status in ('consumed','discarded') and updated_at > now() - interval '30 days')
  select jsonb_build_object(
    'active', (select count(*) from act),
    'expired', (select count(*) from act where expires_on < current_date),
    'soon3', (select count(*) from act where expires_on between current_date and current_date + 3),
    'soon7', (select count(*) from act where expires_on between current_date and current_date + 7),
    'shopping', (select count(*) from public.shopping_items where space_id in (select space_id from sp) and not checked),
    'eaten30', (select count(*) from gone where status = 'consumed'),
    'thrown30', (select count(*) from gone where status = 'discarded'),
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'on', expires_on) order by expires_on) from (select name, expires_on from act where expires_on is not null order by expires_on limit 5) x), '[]'::jsonb),
    'today', current_date
  ) into res;
  return res;
end $$;

revoke all on function public.create_widget_token(), public.revoke_widget_token(), public.has_widget_token() from public, anon;
grant execute on function public.create_widget_token(), public.revoke_widget_token(), public.has_widget_token() to authenticated;
revoke all on function public.widget_summary(text) from public;
grant execute on function public.widget_summary(text) to anon, authenticated;
