/**
 * Vault-style secret / credential row.
 *
 * Exports `<SecretRow>` and the `SecretRowData` type (`{ id, key, value,
 * version?, daysUntilRotation?, lastRotatedAt?, description? }`). Renders
 * key + masked value with Show/Hide and Copy buttons, plus optional Rotate /
 * Delete buttons (shown only when `onRotate` / `onDelete` are passed).
 * `maskChar` customizes the mask glyph (default `'•'`).
 *
 * @example
 * ```tsx
 * import { SecretRow } from '@molecule/app-secret-row-react'
 *
 * function VaultRow({ rotate, remove }: {
 *   rotate: (id: string) => void
 *   remove: (id: string) => void
 * }) {
 *   return (
 *     <SecretRow
 *       secret={{
 *         id: 'sk-1',
 *         key: 'STRIPE_SECRET_KEY',
 *         value: 'sk_live_abc123',
 *         description: 'Stripe API key',
 *         daysUntilRotation: 14,
 *       }}
 *       onRotate={(s) => rotate(s.id)}
 *       onDelete={(s) => remove(s.id)}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Rotation display is expiry-only: `daysUntilRotation < 0` shows an
 *   "Expired" tag; POSITIVE values render nothing (no countdown), and
 *   `lastRotatedAt` is accepted but currently never rendered — surface those
 *   in your own row chrome if needed.
 * - Copy silently does nothing when `navigator.clipboard` is unavailable
 *   (non-HTTPS origins, some webviews) — no error, no fallback.
 * - The version chip renders as `v{version}` — pass `version="2"`, not "v2".
 * - Delete fires immediately — add your own confirmation dialog before
 *   calling a destructive API.
 * - Throws unless inside `<I18nProvider>` with a bonded ClassMap.
 *   Translations: `@molecule/app-locales-secret-row`.
 *
 * @module
 */

export * from './SecretRow.js'
