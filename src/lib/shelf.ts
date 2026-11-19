// Ориентировочные сроки хранения в холодильнике/на кухне (дни), осторожные значения. Только подсказка: решает упаковка и состояние продукта.
const RULES: [RegExp, number][] = [
  [/молок/, 5], [/кефир|ряженк|простокваш/, 7], [/йогурт/, 10], [/сметан/, 7], [/творог/, 5], [/сливк/, 5],
  [/сыр/, 14], [/масл[оа] сливоч|сливочн.* масл/, 30], [/яйц/, 25],
  [/хлеб|батон|булк|багет/, 4], [/лаваш/, 5],
  [/колбас|ветчин|сосис|сардел/, 7], [/бекон/, 7],
  [/кур|индейк|филе/, 2], [/фарш/, 1], [/мяс|говяд|свин|баранин/, 3], [/рыб|лосос|форел|сельд|креветк/, 2],
  [/салат|зелен|укроп|петруш/, 4], [/огур/, 7], [/помидор|томат/, 7], [/перец/, 10], [/гриб|шампин/, 5],
  [/морков/, 21], [/капуст/, 30], [/картоф|картошк/, 30], [/лук|чеснок/, 30], [/свекл/, 21],
  [/яблок/, 21], [/банан/, 5], [/апельсин|мандарин|лимон/, 14], [/виноград/, 7], [/клубник|малин|ягод/, 3],
  [/сок/, 5], [/пельмен|вареник|заморож/, 90],
]
const RULES_EN: [RegExp, number][] = [
  [/\bmilk/, 5], [/kefir|buttermilk/, 7], [/yogh?urt/, 10], [/sour cream/, 7], [/cottage cheese|quark/, 5], [/cream/, 5],
  [/cheese/, 14], [/butter/, 30], [/\begg/, 25],
  [/bread|loaf|bun|baguette|roll/, 4], [/tortilla|pita|wrap/, 5],
  [/sausage|ham|salami|hot dog/, 7], [/bacon/, 7],
  [/chicken|turkey|fillet|poultry/, 2], [/mince|ground (beef|meat|pork)/, 1], [/beef|pork|lamb|meat|steak/, 3], [/fish|salmon|trout|herring|shrimp|prawn|cod/, 2],
  [/lettuce|salad|greens|dill|parsley|spinach|herb/, 4], [/cucumber/, 7], [/tomato/, 7], [/pepper|capsicum/, 10], [/mushroom/, 5],
  [/carrot/, 21], [/cabbage/, 30], [/potato/, 30], [/onion|garlic/, 30], [/beet/, 21],
  [/apple/, 21], [/banana/, 5], [/orange|tangerine|mandarin|lemon|lime/, 14], [/grape/, 7], [/strawberr|raspberr|berr|blueberr/, 3],
  [/juice/, 5], [/dumpling|pierogi|frozen/, 90],
]
export function typicalDays(name: string): number | null {
  const n = name.toLowerCase().replace(/ё/g, 'е')
  if (n.trim().length < 3) return null
  return RULES.find(([r]) => r.test(n))?.[1] ?? RULES_EN.find(([r]) => r.test(n))?.[1] ?? null
}
