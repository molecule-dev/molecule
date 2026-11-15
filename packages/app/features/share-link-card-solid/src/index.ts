/**
 * Solid share-link card.
 *
 * Exports `ShareLinkCard` — a read-only URL field with a copy button, an
 * optional title/description header, a QR slot, and an optional
 * password-protect toggle. It is the Solid counterpart of
 * `@molecule/app-share-link-card-react`: the same props (React names), the
 * same DOM for the same input, the same ClassMap tokens and i18n keys.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 * import { render } from 'solid-js/web'
 * import { MoleculeProvider } from '@molecule/app-solid'
 * import { ShareLinkCard } from '@molecule/app-share-link-card-solid'
 *
 * function SharePanel() {
 *   const [passwordEnabled, setPasswordEnabled] = createSignal(false)
 *   return (
 *     <ShareLinkCard
 *       title="Share this project"
 *       description="Anyone with the link can view."
 *       url="https://app.example.com/p/abc123"
 *       passwordProtect={{ enabled: passwordEnabled(), onChange: setPasswordEnabled }}
 *     />
 *   )
 * }
 *
 * render(() => <MoleculeProvider config={{ i18n: i18nProvider }}><SharePanel /></MoleculeProvider>, document.getElementById('root')!)
 * ```
 *
 * @remarks
 * - QR rendering is slot-based: pass BOTH `qr` and `showQR` — `qr` alone
 *   renders nothing.
 * - Copy silently does nothing when `navigator.clipboard` is unavailable
 *   (non-HTTPS origins) — no error, no fallback.
 * - The password toggle is UI-only: persisting and enforcing the password is
 *   the app/server's job.
 * - Requires a bonded ClassMap (e.g. `@molecule/app-ui-tailwind`) and the
 *   bonded i18n provider. Translations: `@molecule/app-locales-share-link-card`.
 *
 * @module
 */

export * from './ShareLinkCard.jsx'
export * from './types.js'
