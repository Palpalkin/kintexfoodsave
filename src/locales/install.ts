import type { Locale } from '@/lib/i18n'

const l: Locale = {
  ru: {
    'install.title': 'Установить приложение', 'install.sub': 'Значок на экране, работа офлайн, напоминания', 'install.btn': 'Установить',
    'install.iosTitle': 'Установите на iPhone',
    'install.iosA': 'В Safari нажмите «Поделиться» ', 'install.iosB': ' и выберите «На экран “Домой”». Только так на iPhone работают уведомления о сроках.',
  },
  en: {
    'install.title': 'Install the app', 'install.sub': 'Home screen icon, offline use, reminders', 'install.btn': 'Install',
    'install.iosTitle': 'Install on iPhone',
    'install.iosA': 'In Safari tap Share ', 'install.iosB': ' and choose “Add to Home Screen”. This is the only way to get expiry notifications on iPhone.',
  },
}
export default l
