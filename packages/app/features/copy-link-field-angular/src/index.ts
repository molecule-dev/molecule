/**
 * Angular copy-link field.
 *
 * Exports `<CopyLinkField>` — read-only input + copy-to-clipboard button with
 * "Copied!" feedback. Angular counterpart of
 * `@molecule/app-copy-link-field-react`: the same props (React names), the
 * same DOM for the same input, the same ClassMap tokens and i18n keys.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { CopyLinkField } from '@molecule/app-copy-link-field-angular'
 *
 * @Component({
 *   selector: 'invite-card',
 *   standalone: true,
 *   imports: [CopyLinkField],
 *   template: `
 *     <div
 *       mol-copy-link-field
 *       [value]="'https://example.com/invite/abc123'"
 *       [label]="'Share link'"
 *       [feedbackMs]="2000"
 *       (copy)="onCopied()"
 *     />
 *   `,
 * })
 * export class InviteCard {
 *   onCopied(): void {
 *     console.log('copied')
 *   }
 * }
 * ```
 *
 * @remarks
 * The copy button copies through `@molecule/app-clipboard`
 * (`copyTextWithFallback` — the bonded clipboard provider first, then a
 * legacy copy fallback — which resolves `false` instead of throwing), so it
 * works on insecure (non-HTTPS) contexts too; the copied feedback shows and
 * the `copy` output fires only when the copy succeeded. The input is read-only
 * and selects its content on focus, so manual Ctrl/Cmd+C still works as the
 * fallback. Labels use `copyLink.*` i18n keys (companion bond:
 * `@molecule/app-locales-copy-link-field`), read through the binding's
 * reactive `useTranslation()`, so a locale switch refreshes the text. Styling
 * routes through ClassMap tokens (`cm.stack(1)`, `cm.flex`, `cm.input()`,
 * `cm.flex1`) and requires a bonded ClassMap (e.g.
 * `@molecule/app-ui-tailwind`).
 *
 * @module
 */

export * from './copy-link-field.component.js'
export * from './types.js'
