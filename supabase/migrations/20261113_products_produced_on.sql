alter table public.products
  add column if not exists produced_on date,
  add column if not exists shelf_life_days int check (shelf_life_days is null or shelf_life_days > 0);
