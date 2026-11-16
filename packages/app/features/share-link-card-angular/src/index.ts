/**
 * Angular share-link card.
 *
 * Exports `<div mol-share-link-card>` — a read-only URL field with a copy
 * button, an optional title/description header, a QR slot, and an optional
 * password-protect toggle. It is the Angular counterpart of
 * `@molecule/app-share-link-card-react`: the same props (React names), the
 * same DOM for the same input, the same ClassMap tokens and i18n keys.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { ShareLinkCard } from '@molecule/app-share-link-card-angular'
 *
 * @Component({
 *   selector: 'share-panel',
 *   standalone: true,
 *   imports: [ShareLinkCard],
 *   template: `
 *     <div
 *       mol-share-link-card
 *       [url]="'https://app.example.com/p/abc123'"
 *       [passwordProtect]="{ enabled: passwordEnabled, onChange: setPasswordEnabled }"
 *     >
 *       <span slot="title">Share this project</span>
 *       <span slot="description">Anyone with the link can view.</span>
 *     </div>
 *   `,
 * })
 * export class SharePanel {
 *   passwordEnabled = false
 *   readonly setPasswordEnabled = (enabled: boolean): void => {
 *     this.passwordEnabled = enabled
 *   }
 * }
 * ```
 *
 * @remarks
 * - QR rendering is slot-based: pass BOTH `showQR` and `[slot=qr]` content —
 *   the QR node alone renders nothing.
 * - Node props are projected content: `title`, `description` and `qr` are
 *   selected by `[slot=title]`, `[slot=description]` and `[slot=qr]`.
 * - Copy goes through `copyTextWithFallback()` from `@molecule/app-clipboard`:
 *   the bonded clipboard provider first, then the legacy copy command. The
 *   "Copied!" feedback appears only when a copy actually happened — copy never
 *   throws, so a blocked clipboard leaves the label unchanged.
 * - The password toggle is UI-only: persisting and enforcing the password is
 *   the app/server's job.
 * - Requires a bonded ClassMap (e.g. `@molecule/app-ui-tailwind`) and the
 *   bonded i18n provider. Translations: `@molecule/app-locales-share-link-card`.
 *
 * @module
 */

export * from './share-link-card.component.js'
export * from './types.js'
