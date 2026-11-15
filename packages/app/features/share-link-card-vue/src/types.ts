/**
 * Types for the Vue share-link card.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link ShareLinkCard} component. */
export interface ShareLinkCardProps {
  /** Card title. */
  title?: VNodeChild
  /** Supporting copy under the title. */
  description?: VNodeChild
  /** The URL users can copy/share. */
  url: string
  /** Optional QR rendering slot — pass your own QR component from the app side. */
  qr?: VNodeChild
  /** Whether the QR is visible. Defaults to false. */
  showQR?: boolean
  /** Password-protect toggle — pass to render the toggle row. */
  passwordProtect?: {
    /** Whether the toggle is on. */
    enabled: boolean
    /** Called with the toggle's new boolean state. */
    onChange: (enabled: boolean) => void
    /** Row label (a node, or a same-named slot); defaults to a translated "Password protect". */
    label?: VNodeChild
  }
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
