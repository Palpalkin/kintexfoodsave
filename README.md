# KINTEXFOODSAVE

Умная система управления продуктами, сроками годности и питанием. PWA без собственного сервера.

**Стек:** React + Vite + TypeScript + Tailwind (shadcn-стиль) + Lucide · Cloudflare Pages · Supabase (Postgres, Auth, Storage, Edge Functions).

## Что уже есть
- Регистрация и вход (Supabase Auth), RLS на всех таблицах.
- Продукты: срок годности с цветовой индикацией, пагинация (30 шт.), фото со сжатием на клиенте (≤1024px WebP), «использовано / выброшено».
- Семейные пространства: код приглашения, вступление, выход.
- Рецепты: подбор из продуктов через Edge Function `ai-recipes` (смена провайдера — секретом `AI_PROVIDER`), дневной лимит запросов.
- PWA: manifest, service worker, Apple Touch Icon, standalone, офлайн-оболочка, кэш последних данных, офлайн-очередь записей с синхронизацией при появлении сети.
- Напоминания о сроках: проверка при открытии приложения (без фоновых процессов и опроса БД).

## Данные в Supabase
Проект Supabase `KINTEXFOODSAVE` (отдельный, Free). Таблицы в схеме `public`, вспомогательные функции RLS — в закрытой схеме `foodsave_private`. Миграция: `supabase/migrations/`.

## Переменные окружения
См. `.env.example`. Во frontend — только `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY`. `service_role` и ключи AI во frontend/GitHub не попадают.

AI-секреты (Supabase Dashboard → Edge Functions → Secrets или `supabase secrets set`): `AI_API_KEY`, `AI_PROVIDER` (`anthropic` | `openai`), опционально `AI_MODEL`, `AI_DAILY_LIMIT`. Без ключа приложение показывает, что AI не настроен.

## Запуск
```bash
npm install
cp .env.example .env.local   # подставьте publishable key
npm run dev
```

## Деплой на Cloudflare Pages
Pages → Create → Connect to Git → этот репозиторий. Build command: `npm run build`, output: `dist`. Добавьте переменные `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY`. В Supabase → Auth → URL Configuration укажите адрес Pages как Site URL.

## Дальше
- Web Push в фоне (нужны VAPID-ключи + Edge Function по расписанию pg_cron) — пока уведомления только при открытии приложения.
- Сканер штрихкодов, редактирование продуктов, ручное создание рецептов.
