/**
 * Types of `@molecule/app-secret-row-angular` — the Angular counterpart of
 * `@molecule/app-secret-row-react`, same props and DOM.
 *
 * @module
 */

/**
 * Data model for a single secret/credential entry in a vault UI. Node props
 * (`version`, `lastRotatedAt`, `description`) are templated content in Angular
 * (an input cannot carry a node), so they are typed `unknown`: pass plain
 * text/numbers or `<ng-template>` refs.
 */
export interface SecretRowData {
  /** Stable identity of the secret. */
  id: string
  /** The credential's name (`STRIPE_SECRET_KEY`). */
  key: string
  /** Current value (revealed only after the user clicks "Show"). */
  value: string
  /** Version number / label. */
  version?: unknown
  /**
   * Days until the secret should be rotated. A negative value renders an
   * "Expired" tag; zero or a positive value renders a "Rotate in {n}d"
   * countdown.
   */
  daysUntilRotation?: number
  /** Last-rotation timestamp (ISO string or any node); rendered as "Last rotated {value}". */
  lastRotatedAt?: unknown
  /** Additional description (e.g. "Stripe API key"). */
  description?: unknown
}

/** Props accepted by the {@link SecretRow} component. */
export interface SecretRowProps {
  /** The secret to display. */
  secret: SecretRowData
  /** Called when the user clicks Rotate. */
  onRotate?: (secret: SecretRowData) => void
  /** Called when the user clicks Delete. */
  onDelete?: (secret: SecretRowData) => void
  /** Mask character for the hidden value. Defaults to `'•'`. */
  maskChar?: string
  /** Extra classes. */
  className?: string
}
