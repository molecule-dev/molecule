/**
 * Angular vault-style secret / credential row — the counterpart of
 * `@molecule/app-secret-row-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `<SecretRow>` and the `SecretRowData` type (`{ id, key, value,
 * version?, daysUntilRotation?, lastRotatedAt?, description? }`). Renders
 * key + masked value with Show/Hide and Copy buttons, an optional rotation
 * status (an "Expired" tag / "Rotate in {n}d" countdown / "Last rotated
 * {value}" note), plus optional Rotate / Delete buttons (shown only when
 * `onRotate` / `onDelete` are passed). `maskChar` customizes the mask glyph
 * (default `'•'`).
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { SecretRow } from '@molecule/app-secret-row-angular'
 *
 * @Component({
 *   selector: 'app-vault-row',
 *   standalone: true,
 *   imports: [SecretRow],
 *   template: `
 *     <div
 *       mol-secret-row
 *       [secret]="{
 *         id: 'sk-1',
 *         key: 'STRIPE_SECRET_KEY',
 *         value: 'sk_live_abc123',
 *         description: 'Stripe API key',
 *         daysUntilRotation: 14,
 *       }"
 *       [onRotate]="rotate"
 *       [onDelete]="remove"
 *     />
 *   `,
 * })
 * export class VaultRow {}
 * ```
 *
 * @remarks
 * - Rotation status renders from two fields: `daysUntilRotation < 0` shows an
 *   "Expired" tag, `daysUntilRotation >= 0` shows a "Rotate in {n}d" countdown,
 *   and `lastRotatedAt` (when set) renders a "Last rotated {value}" note. Omit
 *   a field to hide its chip.
 * - Copy silently does nothing when `navigator.clipboard` is unavailable
 *   (non-HTTPS origins, some webviews) — no error, no fallback.
 * - The version chip renders as `v{version}` — pass `version="2"`, not "v2".
 * - Delete fires immediately — add your own confirmation dialog before
 *   calling a destructive API.
 * - Node-valued `secret` fields (`version`, `lastRotatedAt`, `description`)
 *   are `<ng-template>` refs or plain strings/numbers. Throws unless the
 *   binding's i18n provider is configured and a ClassMap is bonded.
 *   Translations: `@molecule/app-locales-secret-row`.
 *
 * @module
 */

export * from './secret-row.component.js'
export * from './types.js'
