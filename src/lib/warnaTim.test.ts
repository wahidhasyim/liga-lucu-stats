import { describe, expect, it } from 'vitest'
import { EMAS, slug, warnaTim } from './warnaTim'

describe('warnaTim', () => {
  it('picks a colour from the team name, gold otherwise', () => {
    expect(warnaTim('Tim Merah')).toBe('#e5484d')
    expect(warnaTim('Merah Muda FC')).toBe('#e93d82')
    expect(warnaTim('BIRU')).toBe('#3e8ef7')
    expect(warnaTim('Galacticos')).toBe(EMAS)
  })
})

describe('slug', () => {
  it('makes file-safe names', () => {
    expect(slug('Tim Merah')).toBe('tim-merah')
    expect(slug('  Ça va! 2 ')).toBe('ca-va-2')
    expect(slug('✨')).toBe('tim')
  })
})
