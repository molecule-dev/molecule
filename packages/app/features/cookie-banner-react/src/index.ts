/**
 * GDPR cookie consent banner.
 *
 * Exports `<CookieBanner>` and `CookieCategory` type.
 *
 * @example
 * ```tsx
 * import { CookieBanner } from '@molecule/app-cookie-banner-react'
 *
 * <CookieBanner
 *   visible={!consentGiven}
 *   policyHref="/privacy"
 *   categories={[
 *     { id: 'essential', label: 'Essential', required: true },
 *     { id: 'analytics', label: 'Analytics', defaultEnabled: false },
 *   ]}
 *   onAcceptAll={() => saveConsent('all')}
 *   onRejectAll={() => saveConsent('essential')}
 *   onSave={(enabled) => saveConsent(enabled)}
 *   onDismiss={() => setConsentGiven(true)}
 * />
 * ```
 *
 * @module
 */

export * from './CookieBanner.js'
