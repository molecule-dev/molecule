/**
 * Types for the SafeLink router link.
 *
 * @module
 */

import type { ComponentProps, ReactNode } from 'react'
import type { Link } from 'react-router'

/** Props accepted by {@link SafeLink}: react-router `Link`'s props, with `to` a string path only. */
export type SafeLinkProps = Omit<ComponentProps<typeof Link>, 'to'> & {
  /**
   * Destination: a string path only (`/settings`, `/blog/`). A `#top` fragment is
   * appended when it matches the current path.
   */
  to: string
  /** The link's content. */
  children?: ReactNode
}
