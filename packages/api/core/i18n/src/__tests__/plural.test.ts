import { describe, expect, it } from 'vitest'

import { getPluralForm } from '../plural.js'

describe('getPluralForm', () => {
  describe('English', () => {
    it('returns "one" for 1', () => {
      expect(getPluralForm(1, 'en')).toBe('one')
    })

    it('returns "other" for 0', () => {
      expect(getPluralForm(0, 'en')).toBe('other')
    })

    it('returns "other" for 2', () => {
      expect(getPluralForm(2, 'en')).toBe('other')
    })

    it('returns "other" for large counts', () => {
      expect(getPluralForm(999, 'en')).toBe('other')
    })
  })

  describe('Russian (richer plural rules)', () => {
    it('returns "one" for 1, 21, 31 — anything ending in 1 except 11', () => {
      expect(getPluralForm(1, 'ru')).toBe('one')
      expect(getPluralForm(21, 'ru')).toBe('one')
      expect(getPluralForm(31, 'ru')).toBe('one')
    })

    it('returns "few" for 2-4, 22-24, etc.', () => {
      expect(getPluralForm(2, 'ru')).toBe('few')
      expect(getPluralForm(3, 'ru')).toBe('few')
      expect(getPluralForm(22, 'ru')).toBe('few')
    })

    it('returns "many" for 0, 5-20, 25-30, etc.', () => {
      expect(getPluralForm(0, 'ru')).toBe('many')
      expect(getPluralForm(5, 'ru')).toBe('many')
      expect(getPluralForm(11, 'ru')).toBe('many')
      expect(getPluralForm(20, 'ru')).toBe('many')
    })
  })

  describe('Arabic (six-form CLDR rules)', () => {
    it('returns "zero" for 0', () => {
      expect(getPluralForm(0, 'ar')).toBe('zero')
    })

    it('returns "one" for 1', () => {
      expect(getPluralForm(1, 'ar')).toBe('one')
    })

    it('returns "two" for 2', () => {
      expect(getPluralForm(2, 'ar')).toBe('two')
    })

    it('returns "few" for 3-10', () => {
      expect(getPluralForm(3, 'ar')).toBe('few')
      expect(getPluralForm(10, 'ar')).toBe('few')
    })

    it('returns "many" for 11-99', () => {
      expect(getPluralForm(11, 'ar')).toBe('many')
      expect(getPluralForm(99, 'ar')).toBe('many')
    })
  })

  describe('Japanese (single form)', () => {
    it('always returns "other" — Japanese has no plural distinction', () => {
      expect(getPluralForm(0, 'ja')).toBe('other')
      expect(getPluralForm(1, 'ja')).toBe('other')
      expect(getPluralForm(42, 'ja')).toBe('other')
    })
  })

  describe('locale tags with regions', () => {
    it('handles `en-US`', () => {
      expect(getPluralForm(1, 'en-US')).toBe('one')
      expect(getPluralForm(2, 'en-US')).toBe('other')
    })

    it('handles `pt-BR`', () => {
      expect(getPluralForm(1, 'pt-BR')).toBe('one')
    })
  })
})
