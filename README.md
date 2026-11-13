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

## Сканер чека
Кнопка «Чек» на вкладке «Продукты». Всё распознавание на устройстве, без внешних API:
- **QR-код** (формат ФНС) читается через `jsqr`: из него берётся сумма чека для сверки. QR содержит только реквизиты чека, не товары.
- **Позиции** распознаются по фото (OCR `tesseract.js`, русская модель лежит в `public/tesseract`), затем экран проверки. Сроки годности вводятся вручную: дата производства + «годен N дней/недель/месяцев/лет» (дата считается автоматически) либо «годен до даты».
- Сумма распознанных позиций сверяется с суммой из QR: приложение предупреждает о пропущенных товарах.
- *Необязательно:* Edge Function `receipt-lookup` умеет запрашивать состав чека по QR у стороннего сервиса (proverkacheka.com, нужен токен из их личного кабинета; условия и цены API сервис не публикует, возможно платно). Без секрета `RECEIPT_API_TOKEN` функция выключена, приложение работает через OCR. Формат ответа не проверен на реальном токене.

## Дальше
- Web Push в фоне (нужны VAPID-ключи + Edge Function по расписанию pg_cron) — пока уведомления только при открытии приложения.
- Сканер штрихкодов, редактирование продуктов, ручное создание рецептов.
