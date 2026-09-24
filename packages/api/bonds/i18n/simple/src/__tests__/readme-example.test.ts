/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { addTranslations, formatNumber, setLocale, setProvider, t } from '@molecule/api-i18n'

import { createSimpleI18nProvider } from '../index.js'

describe('README @example', () => {
  it('bonds the simple provider and translates, pluralizes and formats through the core', () => {
    setProvider(createSimpleI18nProvider('en'))
    addTranslations('en', {
      orders: {
        shipped: 'Hi {{name}}, your order shipped.',
        items_one: '{{count}} item',
        items_other: '{{count}} items',
      },
    })
    addTranslations('fr', {
      orders: { shipped: 'Bonjour {{name}}, votre commande est partie.' },
    })

    expect(t('orders.shipped', { name: 'Ada' })).toBe('Hi Ada, your order shipped.')
    expect(t('orders.items', undefined, { count: 3 })).toBe('3 items')
    expect(t('orders.items', undefined, { count: 1 })).toBe('1 item')
    expect(t('orders.shipped', { name: 'Ada' }, { locale: 'fr' })).toBe(
      'Bonjour Ada, votre commande est partie.',
    )

    expect(() => setLocale('de')).toThrow('Locale "de" not found')
    setLocale('fr')
    expect(formatNumber(1234.5).replace(/\s/g, ' ')).toBe('1 234,5')
    // Missing in 'fr' → falls back to English.
    expect(t('orders.items', undefined, { count: 2 })).toBe('2 items')
  })
})
