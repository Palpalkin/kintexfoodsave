import type { Locale } from '@/lib/i18n'

const l: Locale = {
  ru: {
    'shopping.title': 'Список покупок', 'shopping.placeholder': 'Что купить?', 'shopping.favHint': 'Любимые — нажмите, чтобы добавить',
    'shopping.empty': 'Список пуст. Когда вы отметите продукт «использовано», он сам попадёт сюда, чтобы не забыть купить снова.',
    'shopping.bought': 'Куплено', 'shopping.toProducts': 'В продукты (указать срок)', 'shopping.boughtTitle': 'Куплено', 'shopping.clear': 'Очистить', 'shopping.restore': 'Вернуть в список',
  },
  en: {
    'shopping.title': 'Shopping list', 'shopping.placeholder': 'What to buy?', 'shopping.favHint': 'Favorites — tap to add',
    'shopping.empty': 'The list is empty. When you mark a product as "used", it lands here so you do not forget to buy it again.',
    'shopping.bought': 'Bought', 'shopping.toProducts': 'To products (set expiry)', 'shopping.boughtTitle': 'Bought', 'shopping.clear': 'Clear', 'shopping.restore': 'Back to the list',
  },
}
export default l
