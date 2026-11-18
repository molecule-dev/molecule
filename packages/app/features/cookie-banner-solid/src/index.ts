/**
 * Solid GDPR cookie consent banner.
 *
 * Exports `CookieBanner` — the Solid counterpart of
 * `@molecule/app-cookie-banner-react`, with the same props and the same DOM.
 * Two modes: Accept / Reject only, or per-category switches behind
 * "Customize" when `categories` are supplied.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 * import { CookieBanner } from '@molecule/app-cookie-banner-solid'
 *
 * export function App() {
 *   const [consentGiven, setConsentGiven] = createSignal(false)
 *   return (
 *     <CookieBanner
 *       visible={!consentGiven()}
 *       policyHref="/privacy"
 *       categories={[
 *         { id: 'essential', label: 'Essential', required: true },
 *         { id: 'analytics', label: 'Analytics', defaultEnabled: false },
 *       ]}
 *       onAcceptAll={() => saveConsent('all')}
 *       onRejectAll={() => saveConsent('essential')}
 *       onSave={(enabled) => saveConsent(enabled)}
 *       onDismiss={() => setConsentGiven(true)}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * The banner is UI-only — it stores nothing. `onAcceptAll` / `onRejectAll`
 * receive NO arguments (derive "all on"/"essential only" yourself); only
 * `onSave` receives the per-category `Record<string, boolean>`, and the
 * "Save preferences" button renders only when `categories` AND `onSave` are
 * provided and the user opened "Customize". Category toggle state is
 * captured from `categories` on first render — later prop changes do not
 * reset it. Visibility is controlled: keep `visible` false once consent is
 * stored. Text uses `cookieBanner.*` i18n keys (companion bond:
 * `@molecule/app-locales-cookie-banner`); `title`/`description`/category
 * labels you pass in should already be translated.
 *
 * @module
 */

export * from './CookieBanner.jsx'
export * from './types.js'
