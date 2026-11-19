import type { Locale } from '@/lib/i18n'

const l: Locale = {
  ru: {
    'settings.pushOff': 'Уведомления выключены', 'settings.pushOnDone': 'Готово: уведомления приходят раз в день в 09:00 по Москве',
    'settings.title': 'Настройки', 'settings.last30': 'За 30 дней', 'settings.used': 'использовано', 'settings.thrown': 'выброшено', 'settings.saved': 'спасено',
    'settings.notifyDays': 'Напоминать о сроке за (дней)', 'settings.save': 'Сохранить',
    'settings.autoShop': 'Добавлять в список покупок продукты, отмеченные «использовано»', 'settings.autoShopHint': 'Выброшенные можно добавить вручную из подсказки.',
    'settings.pushStatus': 'Уведомления о сроках:', 'settings.on': 'включены', 'settings.off': 'выключены',
    'settings.iosPush': 'На iPhone уведомления работают только из установленного приложения: в Safari нажмите «Поделиться» → «На экран Домой», откройте приложение с иконки и вернитесь сюда (нужен iOS 16.4 или новее).',
    'settings.noPush': 'Этот браузер не поддерживает push-уведомления.',
    'settings.disable': 'Выключить', 'settings.enable': 'Включить уведомления', 'settings.test': 'Проверить',
    'settings.pushInfo': 'Раз в день в 09:00 (Москва) приходит сводка: что просрочено и что скоро испортится. Порог задаётся выше.',
    'settings.statsLink': '📊 Подробная статистика по месяцам →', 'settings.spentTitle': 'Траты по чекам в этом месяце', 'settings.bought': 'куплено',
    'settings.export': 'Экспорт данных', 'settings.exportJson': 'JSON-копия', 'settings.tour': 'Показать приветствие',
    'settings.delTitle': 'Удалить аккаунт', 'settings.delInfo': 'Безвозвратно удалит аккаунт, ваши пространства и все данные в них. Это же отзыв согласия на обработку персональных данных.',
    'settings.delConfirm1': 'Удалить аккаунт и все данные без возможности восстановления?', 'settings.delConfirm2': 'Точно удалить? Отменить будет нельзя.',
    'settings.delFail': 'Не удалось удалить: {msg}', 'settings.delBtn': 'Удалить аккаунт и данные', 'settings.signOut': 'Выйти из аккаунта',
    'settings.off.credit': 'Фото и бренды продуктов: Open Food Facts (CC BY-SA)',
  },
  en: {
    'settings.pushOff': 'Notifications turned off', 'settings.pushOnDone': 'Done: you will get a notification daily at 09:00 Moscow time',
    'settings.title': 'Settings', 'settings.last30': 'Last 30 days', 'settings.used': 'used', 'settings.thrown': 'thrown away', 'settings.saved': 'saved',
    'settings.notifyDays': 'Remind me this many days before expiry', 'settings.save': 'Save',
    'settings.autoShop': 'Add products marked “used” to the shopping list', 'settings.autoShopHint': 'Thrown-away items can be added manually from the suggestion.',
    'settings.pushStatus': 'Expiry notifications:', 'settings.on': 'on', 'settings.off': 'off',
    'settings.iosPush': 'On iPhone, notifications only work from the installed app: in Safari tap Share → Add to Home Screen, open the app from its icon and come back here (iOS 16.4 or newer required).',
    'settings.noPush': 'This browser does not support push notifications.',
    'settings.disable': 'Turn off', 'settings.enable': 'Turn on notifications', 'settings.test': 'Send test',
    'settings.pushInfo': 'Once a day at 09:00 (Moscow time) you get a digest of what has expired and what is about to spoil. Set the threshold above.',
    'settings.statsLink': '📊 Detailed monthly statistics →', 'settings.spentTitle': 'Receipt spending this month', 'settings.bought': 'bought',
    'settings.export': 'Export data', 'settings.exportJson': 'JSON backup', 'settings.tour': 'Show welcome tour',
    'settings.delTitle': 'Delete account', 'settings.delInfo': 'Permanently deletes your account, your spaces and all their data. This also withdraws your consent to personal data processing.',
    'settings.delConfirm1': 'Delete your account and all data permanently?', 'settings.delConfirm2': 'Are you sure? This cannot be undone.',
    'settings.delFail': 'Could not delete: {msg}', 'settings.delBtn': 'Delete account and data', 'settings.signOut': 'Sign out',
    'settings.off.credit': 'Product photos and brands: Open Food Facts (CC BY-SA)',
  },
}
export default l
