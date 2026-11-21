import type { Locale } from '@/lib/i18n'

const l: Locale = {
  ru: {
    'calendar.title': 'Календарь сроков', 'calendar.expired': 'просрочено', 'calendar.soon': 'в ближайшие 3 дня', 'calendar.later': 'позже', 'calendar.none': 'В этот день ничего не портится.',
    'products.calendar': 'Календарь',
    'level.title': 'Уровень {lv}', 'level.next': 'До следующего уровня: {n}', 'level.max': 'Максимальный уровень!', 'level.used': 'использовано продуктов',
    'week.title': 'Челлендж недели', 'week.text': 'Использовать {goal} продуктов за 7 дней', 'week.done': 'Выполнено! Так держать 🎉',
    'badges.title': 'Достижения',
    'badge.first': 'Первый шаг', 'badge.ten': '10 продуктов спасено', 'badge.fifty': '50 продуктов спасено', 'badge.hundred': '100 продуктов спасено',
    'badge.streak7': '7 дней без выброса', 'badge.streak30': '30 дней без выброса', 'badge.zeroMonth': 'Месяц без выброса',
  },
  en: {
    'calendar.title': 'Expiry calendar', 'calendar.expired': 'expired', 'calendar.soon': 'within 3 days', 'calendar.later': 'later', 'calendar.none': 'Nothing expires on this day.',
    'products.calendar': 'Calendar',
    'level.title': 'Level {lv}', 'level.next': 'To next level: {n}', 'level.max': 'Max level!', 'level.used': 'products used',
    'week.title': 'Weekly challenge', 'week.text': 'Use {goal} products in 7 days', 'week.done': 'Done! Keep it up 🎉',
    'badges.title': 'Achievements',
    'badge.first': 'First step', 'badge.ten': '10 products saved', 'badge.fifty': '50 products saved', 'badge.hundred': '100 products saved',
    'badge.streak7': '7 days without waste', 'badge.streak30': '30 days without waste', 'badge.zeroMonth': 'Waste-free month',
  },
}
export default l
