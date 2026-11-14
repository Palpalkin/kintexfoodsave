-- Любимые продукты пространства + ссылка на фото из открытой базы и бренд у продукта.
create table if not exists public.favorites (
  space_id uuid not null references public.spaces(id) on delete cascade,
  name_key text not null,
  name text not null check (char_length(name) between 1 and 160),
  unit text not null default 'шт',
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (space_id, name_key)
);
alter table public.favorites enable row level security;
create policy fav_select on public.favorites for select using (foodsave_private.is_member(space_id));
create policy fav_insert on public.favorites for insert with check (foodsave_private.is_member(space_id) and created_by = (select auth.uid()));
create policy fav_delete on public.favorites for delete using (foodsave_private.is_member(space_id));
alter table public.products add column if not exists photo_url text check (photo_url is null or photo_url like 'https://%'),
  add column if not exists brand text;
