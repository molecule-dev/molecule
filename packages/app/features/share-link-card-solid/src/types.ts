/**
 * Types for the Solid share-link card.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props accepted by the {@link ShareLinkCard} component. */
export interface ShareLinkCardProps {
  /** Card title. */
  title?: JSX.Element
  /** Supporting copy under the title. */
  description?: JSX.Element
  /** The URL users can copy/share. */
  url: string
  /** Optional QR rendering slot — pass your own QR component from the app side. */
  qr?: JSX.Element
  /** Whether the QR is visible. Defaults to false. */
  showQR?: boolean
  /** Password-protect toggle — pass to render the toggle row. */
  passwordProtect?: {
    /** Whether the toggle is on. */
    enabled: boolean
    /** Called with the toggle's new boolean state. */
    onChange: (enabled: boolean) => void
    /** Row label; defaults to a translated "Password protect". */
    label?: JSX.Element | (() => JSX.Element)
  }
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
