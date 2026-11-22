/**
 * Types for the SafeLink router link.
 *
 * @module
 */

import type { ReactNode } from 'react'

import type { LinkProps } from '@molecule/app-react/link'

/** Props accepted by {@link SafeLink}: `LinkProps` from `@molecule/app-react/link`, with `to` a string path only. */
export type SafeLinkProps = Omit<LinkProps, 'to'> & {
  /**
   * Destination: a string path only (`/settings`, `/blog/`). A `#top` fragment is
   * appended when it matches the current path.
   */
  to: string
  /** The link's content. */
  children?: ReactNode
}
