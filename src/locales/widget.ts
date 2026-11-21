import type { Locale } from '@/lib/i18n'

const l: Locale = {
  ru: {
    'widget.title': 'Виджет для iPhone', 'widget.intro': 'Количество продуктов, что скоро испортится и статистика прямо на главном экране и экране блокировки. Работает через бесплатное приложение Scriptable.',
    'widget.create': 'Создать ссылку для виджета', 'widget.regen': 'Создать заново (старая перестанет работать)', 'widget.revoke': 'Отключить виджет',
    'widget.copy': 'Скопировать скрипт', 'widget.copied': 'Скопировано', 'widget.active': 'Виджет включён. Токен показывается только при создании — если потеряли, создайте заново.',
    'widget.s1': 'Установите бесплатное приложение Scriptable из App Store.', 'widget.s2': 'Нажмите «Скопировать скрипт» ниже. В Scriptable нажмите «+» и вставьте скрипт, назовите его FoodSave.',
    'widget.s3': 'На главном экране: долгое нажатие → «+» → Scriptable → выберите размер → «Добавить». Затем нажмите на виджет → Script: FoodSave.',
    'widget.s4': 'Для экрана блокировки: долгое нажатие на экран блокировки → «Настроить» → добавьте Scriptable → выберите FoodSave.',
    'widget.privacy': 'Токен даёт доступ только на чтение сводки: счётчики и названия 5 ближайших продуктов. Не публикуйте скрипт. Если он попал не в те руки — нажмите «Отключить виджет».',
    'widget.err': 'Не удалось создать токен. Проверьте интернет и попробуйте ещё раз.',
    'widget.badge': 'Число на иконке приложения (iPhone, после установки на главный экран и включения уведомлений) показывает, сколько продуктов скоро испортится.',
  },
  en: {
    'widget.title': 'iPhone widget', 'widget.intro': 'Product count, what expires soon and your stats right on the home and lock screen. Works through the free Scriptable app.',
    'widget.create': 'Create widget link', 'widget.regen': 'Create again (the old one stops working)', 'widget.revoke': 'Turn off widget',
    'widget.copy': 'Copy script', 'widget.copied': 'Copied', 'widget.active': 'Widget is on. The token is shown only once at creation — if you lost it, create a new one.',
    'widget.s1': 'Install the free Scriptable app from the App Store.', 'widget.s2': 'Tap "Copy script" below. In Scriptable tap "+", paste the script and name it FoodSave.',
    'widget.s3': 'Home screen: long-press → "+" → Scriptable → pick a size → "Add". Then tap the widget → Script: FoodSave.',
    'widget.s4': 'Lock screen: long-press the lock screen → "Customize" → add Scriptable → choose FoodSave.',
    'widget.privacy': 'The token gives read-only access to a summary: counters and names of the 5 nearest products. Do not share the script. If it gets into the wrong hands, tap "Turn off widget".',
    'widget.err': 'Could not create the token. Check your connection and try again.',
    'widget.badge': 'The badge number on the app icon (iPhone, after adding to the home screen and allowing notifications) shows how many products expire soon.',
  },
}
export default l
