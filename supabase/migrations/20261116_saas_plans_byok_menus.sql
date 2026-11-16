-- SaaS-слой: язык, подписки, лимиты бесплатного тарифа, свой AI-ключ в Vault, меню, платежи.

alter table public.user_settings add column if not exists lang text check (lang in ('ru','en'));

-- ===== Подписки (пишет только сервер: webhook/billing) =====
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'pro' check (plan in ('pro')),
  status text not null check (status in ('active','canceled','past_due')),
  period_end timestamptz not null,
  period text check (period in ('month','year')),
  provider text,
  payment_method_id text,
  auto_renew boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy subs_select_own on public.subscriptions for select using (user_id = (select auth.uid()));
revoke insert, update, delete on public.subscriptions from anon, authenticated;
revoke select on public.subscriptions from anon;
revoke select on public.subscriptions from authenticated;
grant select (user_id, plan, status, period_end, period, provider, auto_renew, updated_at) on public.subscriptions to authenticated;

create table if not exists public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_payment_id text not null unique,
  period text not null check (period in ('month','year')),
  amount_rub numeric(10,2) not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.billing_payments enable row level security;
create policy pay_select_own on public.billing_payments for select using (user_id = (select auth.uid()));
revoke insert, update, delete on public.billing_payments from anon, authenticated;
revoke select on public.billing_payments from anon;

-- ===== Тариф пользователя: Pro = активная подписка ИЛИ 14 дней пробного периода с регистрации =====
create or replace function public.plan_of(p_uid uuid)
returns jsonb language plpgsql security definer set search_path = public, auth stable as $$
declare s record; created timestamptz; trial_end timestamptz;
begin
  select * into s from public.subscriptions where user_id = p_uid;
  select created_at into created from auth.users where id = p_uid;
  trial_end := created + interval '14 days';
  if s.user_id is not null and s.period_end > now() and s.status in ('active','canceled') then
    return jsonb_build_object('plan','pro','source','subscription','until',s.period_end,'auto_renew',s.auto_renew and s.status='active');
  elsif trial_end > now() then
    return jsonb_build_object('plan','pro','source','trial','until',trial_end,'auto_renew',false);
  end if;
  return jsonb_build_object('plan','free','source',null,'until',null,'auto_renew',false);
end $$;
revoke all on function public.plan_of(uuid) from public, anon, authenticated;
grant execute on function public.plan_of(uuid) to service_role;

create or replace function public.my_plan()
returns jsonb language sql security definer set search_path = public stable as $$
  select public.plan_of(auth.uid())
$$;
revoke all on function public.my_plan() from public, anon;
grant execute on function public.my_plan() to authenticated;

-- ===== Лимит бесплатного тарифа: 100 активных продуктов в пространстве (считается по владельцу) =====
create or replace function foodsave_private.enforce_product_limit()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare owner uuid; n int;
begin
  select owner_id into owner from public.spaces where id = new.space_id;
  if (public.plan_of(owner)->>'plan') = 'pro' then return new; end if;
  select count(*) into n from public.products where space_id = new.space_id and status = 'active';
  if n >= 100 then raise exception 'plan_limit_products' using hint = 'Free plan allows 100 active products'; end if;
  return new;
end $$;
drop trigger if exists products_limit on public.products;
create trigger products_limit before insert on public.products for each row execute function foodsave_private.enforce_product_limit();

-- ===== Свой AI-ключ пользователя: ключ хранится в Supabase Vault, клиент его никогда не читает =====
create table if not exists public.user_ai_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null check (provider in ('anthropic','openai','openrouter')),
  model text not null check (model ~ '^[A-Za-z0-9._:/-]{1,80}$'),
  key_hint text not null,
  secret_id uuid not null,
  updated_at timestamptz not null default now()
);
alter table public.user_ai_settings enable row level security;
create policy ai_select_own on public.user_ai_settings for select using (user_id = (select auth.uid()));
revoke all on public.user_ai_settings from anon, authenticated;
grant select (user_id, provider, model, key_hint, updated_at) on public.user_ai_settings to authenticated;

create or replace function public.set_user_ai_key(p_uid uuid, p_provider text, p_model text, p_key text)
returns void language plpgsql security definer set search_path = public, vault as $$
declare sid uuid;
begin
  select secret_id into sid from public.user_ai_settings where user_id = p_uid;
  if sid is null then
    sid := vault.create_secret(p_key, 'foodsave-ai-' || p_uid::text, 'FoodSave user AI key');
  else
    perform vault.update_secret(sid, p_key);
  end if;
  insert into public.user_ai_settings(user_id, provider, model, key_hint, secret_id)
  values (p_uid, p_provider, p_model, right(p_key, 4), sid)
  on conflict (user_id) do update set provider = excluded.provider, model = excluded.model, key_hint = excluded.key_hint, secret_id = excluded.secret_id, updated_at = now();
end $$;

create or replace function public.get_user_ai_key(p_uid uuid)
returns table(provider text, model text, api_key text) language sql security definer set search_path = public, vault stable as $$
  select s.provider, s.model, d.decrypted_secret from public.user_ai_settings s
  join vault.decrypted_secrets d on d.id = s.secret_id where s.user_id = p_uid
$$;

create or replace function public.delete_user_ai_key(p_uid uuid)
returns void language plpgsql security definer set search_path = public, vault as $$
declare sid uuid;
begin
  select secret_id into sid from public.user_ai_settings where user_id = p_uid;
  delete from public.user_ai_settings where user_id = p_uid;
  if sid is not null then delete from vault.secrets where id = sid; end if;
end $$;
revoke all on function public.set_user_ai_key(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.get_user_ai_key(uuid) from public, anon, authenticated;
revoke all on function public.delete_user_ai_key(uuid) from public, anon, authenticated;
grant execute on function public.set_user_ai_key(uuid,text,text,text), public.get_user_ai_key(uuid), public.delete_user_ai_key(uuid) to service_role;

-- удаление аккаунта теперь удаляет и ключ из Vault
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, storage, auth, vault as $$
declare uid uuid := auth.uid(); sid uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select secret_id into sid from public.user_ai_settings where user_id = uid;
  if sid is not null then delete from vault.secrets where id = sid; end if;
  delete from storage.objects where bucket_id = 'foodsave-photos'
     and (storage.foldername(name))[1] in (select id::text from public.spaces where owner_id = uid);
  delete from auth.users where id = uid;
end $$;

-- ===== Меню (план питания) =====
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  days int not null check (days between 1 and 31),
  lang text not null default 'ru',
  plan jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.meal_plans enable row level security;
create policy mp_select on public.meal_plans for select using (foodsave_private.is_member(space_id));
create policy mp_insert on public.meal_plans for insert with check (foodsave_private.is_member(space_id) and created_by = (select auth.uid()));
create policy mp_delete on public.meal_plans for delete using (foodsave_private.is_member(space_id));
create index if not exists meal_plans_space_created on public.meal_plans(space_id, created_at desc);
