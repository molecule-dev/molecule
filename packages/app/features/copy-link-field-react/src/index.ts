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
 * Copying uses `navigator.clipboard`, which exists only in secure contexts
 * (HTTPS / localhost) — elsewhere the button silently does nothing and
 * `onCopy` never fires. The input is read-only and selects its content on
 * focus, so manual Ctrl/Cmd+C still works as the fallback. Labels use
 * `copyLink.*` i18n keys (companion bond: `@molecule/app-locales-copy-link-field`).
 *
 * @module
 */

export * from './CopyLinkField.js'
