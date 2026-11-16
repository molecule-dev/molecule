/**
 * React copy-link field.
 *
 * Exports `<CopyLinkField>` — read-only input + copy-to-clipboard button with "Copied!" feedback.
 *
 * @example
 * ```tsx
 * import { CopyLinkField } from '@molecule/app-copy-link-field-react'
 *
 * <CopyLinkField
 *   label="Share link"
 *   value="https://example.com/invite/abc123"
 *   onCopy={() => console.log('copied')}
 *   feedbackMs={2000}
 * />
 * ```
 *
 * @remarks
 * The copy button copies through `@molecule/app-clipboard`
 * (`copyTextWithFallback` — the bonded clipboard provider first, then a
 * legacy copy fallback — which resolves `false` instead of throwing), so it
 * works on insecure (non-HTTPS) contexts too; the copied feedback shows and
 * `onCopy` fires only when the copy succeeded. The input is read-only and
 * selects its content on focus, so manual Ctrl/Cmd+C still works as the
 * fallback. Labels use `copyLink.*` i18n keys (companion bond:
 * `@molecule/app-locales-copy-link-field`).
 *
 * @module
 */

export * from './CopyLinkField.js'
