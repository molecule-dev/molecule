/**
 * REAL-DEPENDENCY integration tests — the full provider lifecycle against the
 * real `@molecule/api-i18n` utilities and the real `Intl` APIs (no mocks).
 *
 * The unit suite covers shapes and edge cases; this file pins the
 * CONSUMER-EXPERIENCE properties a server actually depends on — per-request
 * locale translation (emails/notifications), English fallback for
 * partially-translated locales, CLDR plural selection — and the
 * failure-disambiguation contract (unknown locale THROWS with the locale name;
 * a missing key quietly falls back; the two are never confusable).
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '../provider.js'

const makeProvider = () =>
  createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      direction: 'ltr',
      translations: {
        'user.email.resetSubject': 'Reset your {{appName}} password',
        'user.email.expires': 'This link expires {{ when }}.',
        'en.only': 'English only',
        item_one: '{{count}} item',
        item_other: '{{count}} items',
      },
    },
    {
      code: 'fr',
      name: 'Français',
      direction: 'ltr',
      translations: {
        'user.email.resetSubject': 'Réinitialisez votre mot de passe {{appName}}',
      },
    },
    {
      code: 'ar',
      name: 'العربية',
      direction: 'rtl',
      translations: {
        item_few: '{{count}} عناصر',
        item_other: '{{count}} عنصر',
      },
    },
  ])

describe('@molecule/api-i18n-simple × REAL core utilities + Intl', () => {
  it('full lifecycle: per-request locale translation (the email flow from the docs)', () => {
    const p = makeProvider()

    // Error responses: default locale (English).
    expect(p.t('user.email.resetSubject', { appName: 'Acme' })).toBe('Reset your Acme password')

    // Emails: translate in the USER's locale via the per-request override —
    // no global setLocale, so concurrent requests can't race each other.
    expect(p.t('user.email.resetSubject', { appName: 'Acme' }, { locale: 'fr' })).toBe(
      'Réinitialisez votre mot de passe Acme',
    )
    // The global locale was never touched.
    expect(p.getLocale()).toBe('en')

    // Interpolation tolerates "{{ when }}" inner whitespace — the way
    // translators actually write tokens; a strict matcher leaked the literal
    // braces into sent emails.
    expect(p.t('user.email.expires', { when: 'in 1 hour' })).toBe('This link expires in 1 hour.')
  })

  it('CONSUMER PROPERTY: a partially-translated locale renders English text, never raw keys', () => {
    const p = makeProvider()
    // fr has SOME translations but not this key — the user must see English,
    // not "en.only" (and not depend on every call site passing defaultValue).
    expect(p.t('en.only', undefined, { locale: 'fr' })).toBe('English only')
    // Same guarantee for a completely unknown request locale (e.g. an
    // Accept-Language the app never registered).
    expect(p.t('en.only', undefined, { locale: 'xx' })).toBe('English only')
    // Plural keys get the same English fallback.
    expect(p.t('item', undefined, { locale: 'fr', count: 2 })).toBe('2 items')
  })

  it('CONSUMER PROPERTY: real CLDR plural selection per locale (Arabic few/other)', () => {
    const p = makeProvider()
    expect(p.t('item', undefined, { count: 1 })).toBe('1 item')
    expect(p.t('item', undefined, { count: 5 })).toBe('5 items')
    // Arabic: 3 → 'few' (a category English doesn't have), 100 → 'other'.
    expect(p.t('item', undefined, { locale: 'ar', count: 3 })).toBe('3 عناصر')
    expect(p.t('item', undefined, { locale: 'ar', count: 100 })).toBe('100 عنصر')
  })

  it('FAILURE DISAMBIGUATION: unknown locale on setLocale THROWS with the name; missing key does not', () => {
    const p = makeProvider()
    // Misconfigured locale = loud, actionable error naming the locale…
    expect(() => p.setLocale('xx')).toThrow('Locale "xx" not found')
    // …while a missing KEY is a quiet fallback: defaultValue, else the key
    // itself (so logs show exactly which key is untranslated).
    expect(p.t('missing.key', undefined, { defaultValue: 'Fallback' })).toBe('Fallback')
    expect(p.t('missing.key')).toBe('missing.key')
    // exists() lets callers tell "key not registered" from "translated".
    expect(p.exists('missing.key')).toBe(false)
    expect(p.exists('en.only')).toBe(true)
  })

  it('formats through the real Intl APIs, including destructured formatDate({ relative: true })', () => {
    const p = makeProvider()
    expect(p.formatNumber(1234.5)).toBe('1,234.5')
    expect(p.formatList(['a', 'b', 'c'])).toBe('a, b, and c')
    expect(p.formatRelativeTime(new Date(Date.now() - 3 * 86_400_000), { unit: 'day' })).toBe(
      '3 days ago',
    )
    // Destructuring methods off the provider must not break `relative:
    // true` — it previously crashed on an unbound `this`.
    const { formatDate } = p
    expect(formatDate(new Date(Date.now() - 2 * 3_600_000), { relative: true })).toBe('2 hours ago')
    expect(p.getDirection()).toBe('ltr')
    p.setLocale('ar')
    expect(p.getDirection()).toBe('rtl')
  })
})
