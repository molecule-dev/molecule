import { describe, expect, it } from 'vitest'

import { en } from '../en.js'
import type { FooterTranslationKey } from '../types.js'

/**
 * Keys the `@molecule/app-footer-react` component passes to `t()`. Mirrors the
 * literal `t('…')` calls in `AppFooter.tsx`; every one must resolve in this
 * bond's canonical `en` or that surface falls back to English in all 79
 * languages (or, for the empty content keys, renders a blank modal).
 */
const REFERENCED_FOOTER_KEYS: FooterTranslationKey[] = [
  'footer.version',
  'footer.about',
  'footer.privacyPolicy',
  'footer.termsOfService',
  'footer.language',
  'footer.legalNotConfigured',
]

describe('app-locales-footer canonical en', () => {
  it('defines footer.about (L100 — About label was English-only across 79 languages)', () => {
    expect(en['footer.about']).toBe('About {{appName}}')
  })

  it('defines every footer.* key the footer-react component references', () => {
    for (const key of REFERENCED_FOOTER_KEYS) {
      expect(en[key], `missing bond key: ${key}`).toBeTruthy()
    }
  })

  it('provides the honest legal-not-configured placeholder message', () => {
    expect(en['footer.legalNotConfigured']).toMatch(/not been configured/i)
    expect(en['footer.legalNotConfigured']).toMatch(/app owner must provide it/i)
  })

  it('never defines the legal content keys, which the app supplies', () => {
    // A generic default policy would be legally wrong to present as the app's own, so
    // the footer renders `footer.legalNotConfigured` until the app registers real
    // content (its call site defaults content.* to ''). The bond carried those keys as
    // '' once; loading its language after the app's content then blanked the policy.
    expect(en).not.toHaveProperty('content.privacyPolicy')
    expect(en).not.toHaveProperty('content.termsOfService')
  })
})
