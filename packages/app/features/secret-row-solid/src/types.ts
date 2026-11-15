/**
 * Types of `@molecule/app-secret-row-solid` — the Solid counterpart of
 * `@molecule/app-secret-row-react`, same props and DOM.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Data model for a single secret/credential entry in a vault UI. */
export interface SecretRowData {
  /** Stable identity of the secret. */
  id: string
  /** The credential's name (`STRIPE_SECRET_KEY`). */
  key: string
  /** Current value (revealed only after the user clicks "Show"). */
  value: string
  /** Version number / label (React's `ReactNode`: any Solid JSX element). */
  version?: JSX.Element
  /**
   * Days until the secret should be rotated. A negative value renders an
   * "Expired" tag; zero or a positive value renders a "Rotate in {n}d"
   * countdown.
   */
  daysUntilRotation?: number
  /** Last-rotation timestamp (ISO string or any node); rendered as "Last rotated {value}". */
  lastRotatedAt?: JSX.Element
  /** Additional description (e.g. "Stripe API key"). */
  description?: JSX.Element
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
