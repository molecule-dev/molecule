/**
 * Types of `@molecule/app-copy-link-field-angular` — the Angular counterpart
 * of `@molecule/app-copy-link-field-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props for `CopyLinkField` — the same props
 * `@molecule/app-copy-link-field-react` accepts. `onCopy` is an Angular
 * output (`copy`) in this counterpart: bind it in the host template as
 * `(copy)="onCopy()"`.
 */
export interface CopyLinkFieldProps {
  /** Value to display (and copy on click). */
  value: string
  /** Optional label above the field. */
  label?: string
  /** Called after a successful copy (the `copy` output). */
  onCopy?: () => void
  /** How long the "Copied!" state lingers (ms). Defaults to 1500. */
  feedbackMs?: number
  /** Size of the copy button. Defaults to `'sm'`. */
  size?: 'sm' | 'md'
  /** Extra classes. */
  className?: string
}
