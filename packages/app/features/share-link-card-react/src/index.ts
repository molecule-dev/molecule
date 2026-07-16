/**
 * Share-link card with URL, copy button, optional QR slot, password toggle.
 *
 * Exports `<ShareLinkCard>` (the internal read-only URL + copy-button field
 * it renders is not exported). Card props: `url` (required), `title?`,
 * `description?`, `qr?` (your QR ReactNode) + `showQR?` (BOTH must be set
 * for the QR to render — `showQR` defaults to false), `passwordProtect?`
 * (`{ enabled, onChange, label? }` renders a Switch row), `className?`,
 * `dataMolId?`.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { ShareLinkCard } from '@molecule/app-share-link-card-react'
 *
 * function SharePanel() {
 *   const [passwordEnabled, setPasswordEnabled] = useState(false)
 *   return (
 *     <ShareLinkCard
 *       title="Share this project"
 *       description="Anyone with the link can view."
 *       url="https://app.example.com/p/abc123"
 *       passwordProtect={{ enabled: passwordEnabled, onChange: setPasswordEnabled }}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - QR rendering is slot-based: bring your own QR component (e.g.
 *   qrcode.react) and pass BOTH `qr` and `showQR` — `qr` alone renders
 *   nothing.
 * - Copy silently does nothing when `navigator.clipboard` is unavailable
 *   (non-HTTPS origins) — no error, no fallback.
 * - The card's internal copy field is a trimmed local variant of
 *   `@molecule/app-copy-link-field-react` (which adds `label`, `onCopy`,
 *   `feedbackMs`, `size`); use that package directly when you need a
 *   standalone copy field.
 * - The password toggle is UI-only: persisting and enforcing the password
 *   is entirely the app/server's job.
 * - Throws unless inside `<I18nProvider>` with a bonded ClassMap.
 *   Translations: `@molecule/app-locales-share-link-card`.
 *
 * @module
 */

export * from './ShareLinkCard.js'
