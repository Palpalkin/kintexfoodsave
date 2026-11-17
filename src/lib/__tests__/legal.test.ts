import { describe, expect, it } from 'vitest'
import { LEGAL } from '@/lib/legal'
import { LEGAL_PATHS } from '@/pages/Legal'

describe('legal', () => {
  it('has the current version', () => { expect(LEGAL.version).toBe('1.2') })
  it('exports the three legal paths', () => { expect(LEGAL_PATHS).toEqual(['/privacy', '/consent', '/terms']) })
})
