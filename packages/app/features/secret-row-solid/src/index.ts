/**
 * Solid vault-style secret / credential row.
 *
 * Exports `<SecretRow>` and the `SecretRowData` type (`{ id, key, value,
 * version?, daysUntilRotation?, lastRotatedAt?, description? }`). Renders
 * key + masked value with Show/Hide and Copy buttons, an optional rotation
 * status (an "Expired" tag / "Rotate in {n}d" countdown / "Last rotated
 * {value}" note), plus optional Rotate / Delete buttons (shown only when
 * `onRotate` / `onDelete` are passed). `maskChar` customizes the mask glyph
 * (default `'•'`). It is the Solid counterpart of
 * `@molecule/app-secret-row-react`: the same props (React names) and the same
 * DOM for the same input.
 *
 * @example
 * ```tsx
 * import { SecretRow } from '@molecule/app-secret-row-solid'
 *
 * export function VaultRow() {
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
 * - Rotation status renders from two fields: `daysUntilRotation < 0` shows an
 *   "Expired" tag, `daysUntilRotation >= 0` shows a "Rotate in {n}d" countdown,
 *   and `lastRotatedAt` (when set) renders a "Last rotated {value}" note. Omit
 *   a field to hide its chip.
 * - Copying goes through `copyTextWithFallback` (`@molecule/app-clipboard`):
 *   the Clipboard API through the bonded clipboard provider when one is
 *   wired, the legacy copy command otherwise — so it also works on
 *   plain-HTTP pages and inside iframes. The function never throws; when the
 *   copy is blocked the button shows no feedback.
 * - The version chip renders as `v{version}` — pass `version="2"`, not "v2".
 * - Delete fires immediately — add your own confirmation dialog before
 *   calling a destructive API.
 * - Throws unless inside a Solid app with the binding's theme and i18n
 *   providers and a bonded ClassMap. Translations:
 *   `@molecule/app-locales-secret-row`.
 *
 * @module
 */

export * from './SecretRow.jsx'
export * from './types.js'
