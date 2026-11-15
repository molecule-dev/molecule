/**
 * Types for the Vue copy-link field.
 *
 * @module
 */

/** Props for the {@link CopyLinkField} component. */
export interface CopyLinkFieldProps {
  /** Value to display (and copy on click). */
  value: string
  /** Optional label above the field. */
  label?: string
  /** Called after a successful copy. */
  onCopy?: () => void
  /** How long the "Copied!" state lingers (ms). Defaults to 1500. */
  feedbackMs?: number
  /** Size of the copy button. Defaults to `'sm'`. */
  size?: 'sm' | 'md'
  /** Extra classes. */
  className?: string
}
