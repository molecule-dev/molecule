/**
 * Types for the internal copy field `<ShareLinkCard>` renders (a port of the
 * React package's unexported `CopyLinkField`).
 *
 * @module
 */

/** Props accepted by the internal `CopyLinkField` component. */
export interface CopyLinkFieldProps {
  /** The read-only value to display and copy. */
  value: string
  /** Extra classes. */
  className?: string
}
