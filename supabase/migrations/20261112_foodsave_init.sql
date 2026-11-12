-- KINTEXFOODSAVE: отдельная схема, не затрагивает таблицы других приложений в проекте.
create schema if not exists foodsave;
create schema if not exists foodsave_private;

grant usage on schema foodsave to authenticated;
grant usage on schema foodsave_private to authenticated;

-- ---------- Таблицы ----------
create table foodsave.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now()
);

create table foodsave.space_members (
  space_id uuid not null references foodsave.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
create index on foodsave.space_members (user_id);

create table foodsave.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_space_id uuid references foodsave.spaces(id) on delete set null,
  notify_days_before int not null default 3 check (notify_days_before between 0 and 30),
  updated_at timestamptz not null default now()
);

create table foodsave.products (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references foodsave.spaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  category text,
  quantity numeric not null default 1 check (quantity >= 0),
  unit text not null default 'шт',
  location text,
  expires_on date,
  opened_on date,
  barcode text,
  notes text,
  photo_path text,
  status text not null default 'active' check (status in ('active','consumed','discarded')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on foodsave.products (space_id, status, expires_on);

create table foodsave.recipes (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references foodsave.spaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  ingredients jsonb not null default '[]'::jsonb,
  instructions text not null default '',
  source text not null default 'manual' check (source in ('manual','ai')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create index on foodsave.recipes (space_id, created_at desc);

create table foodsave.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  count int not null default 0,
  primary key (user_id, day)
);

create table foodsave.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  keys jsonb not null,
  created_at timestamptz not null default now()
);
create index on foodsave.push_subscriptions (user_id);

-- ---------- Вспомогательные функции ----------
create or replace function foodsave_private.is_member(p_space uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from foodsave.space_members m
    where m.space_id = p_space and m.user_id = (select auth.uid())
  );
$$;
revoke all on function foodsave_private.is_member(uuid) from public, anon;
grant execute on function foodsave_private.is_member(uuid) to authenticated;

create or replace function foodsave_private.add_owner_member()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into foodsave.space_members (space_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;
revoke all on function foodsave_private.add_owner_member() from public, anon, authenticated;

create trigger spaces_add_owner after insert on foodsave.spaces
  for each row execute function foodsave_private.add_owner_member();

create or replace function foodsave_private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger products_touch before update on foodsave.products
  for each row execute function foodsave_private.touch_updated_at();

-- Вступление в семейное пространство по коду приглашения
create or replace function foodsave.join_space(p_code text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare v_space uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select id into v_space from foodsave.spaces where invite_code = lower(trim(p_code));
  if v_space is null then raise exception 'invalid invite code'; end if;
  insert into foodsave.space_members (space_id, user_id) values (v_space, auth.uid())
  on conflict do nothing;
  return v_space;
end;
$$;
revoke all on function foodsave.join_space(text) from public, anon;
grant execute on function foodsave.join_space(text) to authenticated;

-- Лимит AI-запросов (вызывается из Edge Function с JWT пользователя)
create or replace function foodsave.consume_ai_quota(p_limit int default 10)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare v_count int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into foodsave.ai_usage (user_id, day, count) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set count = foodsave.ai_usage.count + 1
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;
revoke all on function foodsave.consume_ai_quota(int) from public, anon;
grant execute on function foodsave.consume_ai_quota(int) to authenticated;

-- ---------- RLS ----------
alter table foodsave.spaces enable row level security;
alter table foodsave.space_members enable row level security;
alter table foodsave.user_settings enable row level security;
alter table foodsave.products enable row level security;
alter table foodsave.recipes enable row level security;
alter table foodsave.ai_usage enable row level security;
alter table foodsave.push_subscriptions enable row level security;

-- spaces
create policy spaces_select on foodsave.spaces for select to authenticated
  using (owner_id = (select auth.uid()) or foodsave_private.is_member(id));
create policy spaces_insert on foodsave.spaces for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy spaces_update on foodsave.spaces for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy spaces_delete on foodsave.spaces for delete to authenticated
  using (owner_id = (select auth.uid()));

-- members: видны участникам пространства; выйти может сам участник, владелец может удалять других
create policy members_select on foodsave.space_members for select to authenticated
  using (foodsave_private.is_member(space_id));
create policy members_delete on foodsave.space_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from foodsave.spaces s where s.id = space_id and s.owner_id = (select auth.uid()))
  );

-- settings
create policy settings_all on foodsave.user_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- products / recipes
create policy products_select on foodsave.products for select to authenticated
  using (foodsave_private.is_member(space_id));
create policy products_insert on foodsave.products for insert to authenticated
  with check (foodsave_private.is_member(space_id) and created_by = (select auth.uid()));
create policy products_update on foodsave.products for update to authenticated
  using (foodsave_private.is_member(space_id)) with check (foodsave_private.is_member(space_id));
create policy products_delete on foodsave.products for delete to authenticated
  using (foodsave_private.is_member(space_id));

create policy recipes_select on foodsave.recipes for select to authenticated
  using (foodsave_private.is_member(space_id));
create policy recipes_insert on foodsave.recipes for insert to authenticated
  with check (foodsave_private.is_member(space_id) and created_by = (select auth.uid()));
create policy recipes_update on foodsave.recipes for update to authenticated
  using (foodsave_private.is_member(space_id)) with check (foodsave_private.is_member(space_id));
create policy recipes_delete on foodsave.recipes for delete to authenticated
  using (foodsave_private.is_member(space_id));

-- ai_usage: только чтение своих строк, запись через consume_ai_quota
create policy ai_usage_select on foodsave.ai_usage for select to authenticated
  using (user_id = (select auth.uid()));

create policy push_all on foodsave.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- Права на таблицы ----------
grant select, insert, update, delete on foodsave.spaces, foodsave.products, foodsave.recipes,
  foodsave.user_settings, foodsave.push_subscriptions to authenticated;
grant select, delete on foodsave.space_members to authenticated;
grant select on foodsave.ai_usage to authenticated;

-- ---------- Storage: приватный бакет, путь {space_id}/{файл} ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('foodsave-photos', 'foodsave-photos', false, 1048576,
        array['image/jpeg','image/webp','image/png'])
on conflict (id) do nothing;

create policy foodsave_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'foodsave-photos'
         and foodsave_private.is_member(((storage.foldername(name))[1])::uuid));
create policy foodsave_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'foodsave-photos'
         and foodsave_private.is_member(((storage.foldername(name))[1])::uuid));
create policy foodsave_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'foodsave-photos'
         and foodsave_private.is_member(((storage.foldername(name))[1])::uuid));
create policy foodsave_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'foodsave-photos'
         and foodsave_private.is_member(((storage.foldername(name))[1])::uuid));
