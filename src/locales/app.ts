import type { Locale } from '@/lib/i18n'

const l: Locale = {
  ru: {
    'app.tab.products': 'Продукты', 'app.tab.shopping': 'Покупки', 'app.tab.recipes': 'Рецепты', 'app.tab.family': 'Семья', 'app.tab.settings': 'Настройки',
    'app.expiring': 'Скоро истекает срок: {n}',
    'app.envMissing': 'Не настроены переменные окружения {a} и {b}. См. README.',
    'app.pending': 'Ожидает отправки: {n}.', 'app.pendingOnline': 'Нажмите, чтобы отправить сейчас.', 'app.pendingOffline': 'Нет связи: отправится автоматически, когда появится интернет.',
    'app.defaultSpace': 'Мой дом',
  },
  en: {
    'app.tab.products': 'Products', 'app.tab.shopping': 'Shopping', 'app.tab.recipes': 'Recipes', 'app.tab.family': 'Family', 'app.tab.settings': 'Settings',
    'app.expiring': 'Expiring soon: {n}',
    'app.envMissing': 'Environment variables {a} and {b} are not set. See the README.',
    'app.pending': 'Waiting to sync: {n}.', 'app.pendingOnline': 'Tap to sync now.', 'app.pendingOffline': 'Offline: it will sync automatically when you are back online.',
    'app.defaultSpace': 'My home',
  },
}
export default l
