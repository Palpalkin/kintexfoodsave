import type { Locale } from '@/lib/i18n'

const l: Locale = {
  ru: {
    'family.badCode': 'Неверный код приглашения', 'family.joined': 'Вы присоединились к пространству',
    'family.leaveConfirm': 'Выйти из «{name}»?', 'family.title': 'Семейные пространства', 'family.current': 'Текущее пространство',
    'family.members': 'Участников: {n}', 'family.inviteCode': 'Код приглашения (отправьте близким)', 'family.leave': 'Выйти из пространства',
    'family.joinByCode': 'Присоединиться по коду', 'family.codePlaceholder': 'код', 'family.join': 'Войти',
  },
  en: {
    'family.badCode': 'Invalid invite code', 'family.joined': 'You have joined the space',
    'family.leaveConfirm': 'Leave “{name}”?', 'family.title': 'Family spaces', 'family.current': 'Current space',
    'family.members': 'Members: {n}', 'family.inviteCode': 'Invite code (share it with family)', 'family.leave': 'Leave space',
    'family.joinByCode': 'Join with a code', 'family.codePlaceholder': 'code', 'family.join': 'Join',
  },
}
export default l
