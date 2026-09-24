/**
 * GDPR cookie consent banner.
 *
 * Exports `<CookieBanner>` and `CookieCategory` type.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { CookieBanner, type CookieCategory } from '@molecule/app-cookie-banner-react'
 *
 * const COOKIE_CATEGORIES: CookieCategory[] = [
 *   { id: 'essential', label: 'Essential', description: 'Sign-in and security.', required: true },
 *   { id: 'analytics', label: 'Analytics', description: 'Anonymous usage stats.', defaultEnabled: false },
 * ]
 *
 * export function ConsentGate() {
 *   // Persist `consent` server-side (or via your storage bond) and seed it here on load.
 *   const [consent, setConsent] = useState<Record<string, boolean> | null>(null)
 *   return (
 *     <>
 *       <p>{consent ? JSON.stringify(consent) : ''}</p>
 *       <CookieBanner
 *         visible={consent === null}
 *         policyHref="/privacy"
 *         categories={COOKIE_CATEGORIES}
 *         onAcceptAll={() => setConsent({ essential: true, analytics: true })}
 *         onRejectAll={() => setConsent({ essential: true, analytics: false })}
 *         onSave={(enabled) => setConsent(enabled)}
 *       />
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * - The banner is UI-only — it stores nothing, sets/blocks no cookies and loads no scripts.
 *   Keep `visible` false once consent is stored (it defaults to `true`, so omitting it shows
 *   the banner on every load), and gate your analytics on the stored choice yourself.
 * - `onAcceptAll` / `onRejectAll` receive NO arguments (derive "all on"/"essential only"
 *   yourself); only `onSave` receives the per-category `Record<string, boolean>` keyed by
 *   category `id`, with `required` categories always `true`. The "Save preferences" button
 *   renders only when `categories` AND `onSave` are provided and the user opened "Customize".
 * - Category toggle state is captured from `categories` on first render — later prop changes
 *   do not reset it. `onDismiss` fires after ANY of the three buttons (after its own callback).
 * - It is `position: fixed` to the bottom of the viewport; it is not a modal (no focus trap).
 * - It calls `useTranslation()` from `@molecule/app-react`, so it MUST render inside
 *   `<I18nProvider>` / `<MoleculeProvider>` (it throws otherwise); `getClassMap()` throws unless
 *   `setClassMap(classMap)` from `@molecule/app-ui` ran at startup; buttons/switches come from
 *   `@molecule/app-ui-react` (a peer dependency).
 * - Text uses `cookieBanner.*` i18n keys (companion bond: `@molecule/app-locales-cookie-banner`);
 *   `cookieBanner.learnMore` (the policy link) is not in that bond yet. `title`/`description`/
 *   category labels you pass in should already be translated.
 *
 * @module
 */

export * from './CookieBanner.js'
