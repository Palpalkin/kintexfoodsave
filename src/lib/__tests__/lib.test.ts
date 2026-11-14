import { describe, expect, it } from 'vitest'
import { addPeriod, computeExpiry, expiryFields, emptyExpiry } from '../expiry'
import { matches, parseIngredients } from '../match'
import { parseFiscalQr } from '../qr'
import { parseReceipt } from '../receipt'

describe('expiry', () => {
  it('adds days and weeks', () => {
    expect(addPeriod('2026-11-14', 5, 'days')).toBe('2026-11-19')
    expect(addPeriod('2026-11-14', 2, 'weeks')).toBe('2026-11-28')
  })
  it('clamps month end', () => {
    expect(addPeriod('2026-01-31', 1, 'months')).toBe('2026-02-28')
    expect(addPeriod('2028-02-29', 1, 'years')).toBe('2029-02-28')
  })
  it('computes from life mode and until mode', () => {
    expect(computeExpiry({ ...emptyExpiry(), produced: '2026-11-14', amount: '5' })).toBe('2026-11-19')
    expect(computeExpiry({ ...emptyExpiry(), produced: '', amount: '5' })).toBeNull()
    expect(computeExpiry({ ...emptyExpiry(), mode: 'until', until: '2027-01-01' })).toBe('2027-01-01')
  })
  it('derives shelf life days', () => {
    expect(expiryFields({ ...emptyExpiry(), produced: '2026-11-14', amount: '5' })).toEqual({ expires_on: '2026-11-19', produced_on: '2026-11-14', shelf_life_days: 5 })
  })
})

describe('match', () => {
  it('matches by stems', () => {
    expect(matches('молоко', 'Молоко 3,2%')).toBe(true)
    expect(matches('яйца', 'Кефир')).toBe(false)
  })
  it('parses ingredients', () => {
    expect(parseIngredients('молоко - 200 мл\nсоль')).toEqual([{ name: 'молоко', amount: '200 мл' }, { name: 'соль' }])
  })
})

describe('fiscal QR', () => {
  it('parses receipt QR', () => {
    const q = parseFiscalQr('t=20261113T1045&s=550.54&fn=9960440300000000&i=12345&fp=987654321&n=1')
    expect(q).toMatchObject({ date: '2026-11-13', sum: 550.54, fn: '9960440300000000' })
  })
  it('rejects non-receipt text', () => {
    expect(parseFiscalQr('https://example.com')).toBeNull()
  })
})

describe('receipt parser', () => {
  it('extracts items, skips headers', () => {
    const items = parseReceipt('МАГНИТ\nКАССОВЫЙ ЧЕК\nМолоко 3,2% 1л   89,90\nХлеб белый   45,00\nИТОГО 134,90')
    const names = items.map((i) => i.name.toLowerCase())
    expect(names.some((n) => n.includes('молоко'))).toBe(true)
    expect(names.some((n) => n.includes('итого') || n.includes('кассовый'))).toBe(false)
    expect(items.every((i) => i.expires_on === null)).toBe(true)
  })
})
