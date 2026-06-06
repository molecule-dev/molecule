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
 * @module
 */

export * from './CopyLinkField.js'
