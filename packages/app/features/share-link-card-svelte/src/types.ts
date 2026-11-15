/**
 * Types for the Svelte share-link card.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props accepted by the {@link ShareLinkCard} component. */
export interface ShareLinkCardProps {
  /** Card title (a snippet slot). */
  title?: Snippet
  /** Supporting copy under the title (a snippet slot). */
  description?: Snippet
  /** The URL users can copy/share. */
  url: string
  /** Optional QR rendering slot — pass your own QR component from the app side. */
  qr?: Snippet
  /** Whether the QR is visible. Defaults to false. */
  showQR?: boolean
  /** Password-protect toggle — pass to render the toggle row. */
  passwordProtect?: {
    /** Whether the toggle is on. */
    enabled: boolean
    /** Called with the toggle's new boolean state. */
    onChange: (enabled: boolean) => void
    /** Row label (a string or a snippet); defaults to a translated "Password protect". */
    label?: string | Snippet
  }
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
