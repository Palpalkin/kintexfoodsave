// Иконка продукта по ключевым словам названия (вместо пустой заглушки, пока нет фото).
const RULES: [RegExp, string][] = [
  [/молок|кефир|йогурт|сливк|ряженк|простокваш/, '🥛'], [/сыр/, '🧀'], [/сметан|творог/, '🥣'], [/масл/, '🧈'],
  [/яйц/, '🥚'], [/хлеб|батон|булк|лаваш|багет/, '🍞'], [/колбас|сосис|сардел|ветчин|бекон/, '🥓'],
  [/кур|индейк|филе/, '🍗'], [/мяс|говяд|свин|фарш|баранин/, '🥩'], [/рыб|лосос|сельд|форел|тунец|креветк/, '🐟'],
  [/яблок/, '🍎'], [/банан/, '🍌'], [/апельсин|мандарин|лимон/, '🍊'], [/виноград/, '🍇'], [/клубник|ягод|малин/, '🍓'],
  [/помидор|томат/, '🍅'], [/огур/, '🥒'], [/морков/, '🥕'], [/картоф|картошк/, '🥔'], [/лук|чеснок/, '🧅'],
  [/капуст|салат|зелен|укроп|петруш/, '🥬'], [/перец/, '🫑'], [/гриб|шампин/, '🍄'],
  [/рис|греч|круп|макарон|спагет|паста|мук/, '🌾'], [/сок|вод|напит|лимонад|чай|кофе/, '🥤'],
  [/шоколад|конфет|печень|торт|пирожн|вафл/, '🍫'], [/пельмен|вареник|пицц|заморож/, '🥟'], [/суп|борщ/, '🍲'],
]
const RULES_EN: [RegExp, string][] = [
  [/milk|kefir|yogh?urt|cream/, '🥛'], [/cheese/, '🧀'], [/sour cream|cottage|quark/, '🥣'], [/butter/, '🧈'],
  [/\begg/, '🥚'], [/bread|loaf|bun|baguette|tortilla|pita/, '🍞'], [/sausage|ham|bacon|salami/, '🥓'],
  [/chicken|turkey|fillet/, '🍗'], [/beef|pork|lamb|meat|mince|steak/, '🥩'], [/fish|salmon|herring|trout|tuna|shrimp|prawn|cod/, '🐟'],
  [/apple/, '🍎'], [/banana/, '🍌'], [/orange|tangerine|mandarin|lemon|lime/, '🍊'], [/grape/, '🍇'], [/berr/, '🍓'],
  [/tomato/, '🍅'], [/cucumber/, '🥒'], [/carrot/, '🥕'], [/potato/, '🥔'], [/onion|garlic/, '🧅'],
  [/cabbage|lettuce|salad|greens|dill|parsley|spinach/, '🥬'], [/pepper|capsicum/, '🫑'], [/mushroom/, '🍄'],
  [/\brice|buckwheat|grain|cereal|oat|pasta|spaghetti|noodle|flour/, '🌾'], [/juice|water|drink|lemonade|\btea|coffee/, '🥤'],
  [/chocolate|candy|sweet|cookie|biscuit|cake|waffle/, '🍫'], [/dumpling|pierogi|pizza|frozen/, '🥟'], [/soup|borscht/, '🍲'],
]
export function foodEmoji(name: string): string {
  const n = name.toLowerCase()
  return RULES.find(([r]) => r.test(n))?.[1] ?? RULES_EN.find(([r]) => r.test(n))?.[1] ?? '🛒'
}
