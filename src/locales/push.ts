import type { Locale } from '@/lib/i18n'

const l: Locale = {
  ru: {
    'push.denied': 'Уведомления запрещены в настройках браузера', 'push.noKey': 'Не удалось получить ключ уведомлений',
    'push.testFail': 'Не удалось отправить пробное уведомление', 'push.testSent': 'Пробное уведомление отправлено',
    'push.testNotDelivered': 'Сообщение не доставлено, попробуйте выключить и включить заново',
  },
  en: {
    'push.denied': 'Notifications are blocked in your browser settings', 'push.noKey': 'Could not get the notification key',
    'push.testFail': 'Could not send the test notification', 'push.testSent': 'Test notification sent',
    'push.testNotDelivered': 'The message was not delivered, try turning notifications off and on again',
  },
}
export default l
