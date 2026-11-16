import { describe, expect, it } from 'vitest'
import { dicts, setLang, t, tp } from '../i18n'

describe('locales', () => {
  it('every key exists in both languages with same placeholders', () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',')
    const keys = new Set([...Object.keys(dicts.ru), ...Object.keys(dicts.en)])
    const problems: string[] = []
    for (const k of keys) {
      if (!(k in dicts.ru)) problems.push('missing ru: ' + k)
      else if (!(k in dicts.en)) problems.push('missing en: ' + k)
      else if (ph(dicts.ru[k]) !== ph(dicts.en[k])) problems.push('placeholders differ: ' + k)
    }
    expect(problems).toEqual([])
  })
  it('translates and pluralizes', () => {
    setLang('ru'); expect(t('common.cancel')).toBe('Отмена')
    setLang('en'); expect(t('common.cancel')).toBe('Cancel')
    expect(t('no.such.key')).toBe('no.such.key')
  })
})
describe('plural', () => {
  it('ru forms', () => {
    dicts.ru['x.n'] = '{n} день|{n} дня|{n} дней'; dicts.en['x.n'] = '{n} day|{n} days'
    setLang('ru'); expect([1, 2, 5, 11, 21, 22, 25].map((n) => tp('x.n', n))).toEqual(['1 день', '2 дня', '5 дней', '11 дней', '21 день', '22 дня', '25 дней'])
    setLang('en'); expect([tp('x.n', 1), tp('x.n', 2)]).toEqual(['1 day', '2 days'])
    delete dicts.ru['x.n']; delete dicts.en['x.n']
  })
})
