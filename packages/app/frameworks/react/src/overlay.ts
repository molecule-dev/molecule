/**
 * The types implemented by both React overlay adapters.
 * @module
 */

import type { ReactElement, ReactNode } from 'react'

import type { BoxProps, OverlayLayerOptions, OverlayTarget } from '@molecule/app-ui'

/** An opaque token returned by the renderer that registered the layer. */
export interface OverlayLayer {
  readonly token: symbol
}

/** Scope for overlay presentation, optionally owned by a particular element. */
export interface OverlayHostProps {
  children: ReactNode
  owner?: OverlayTarget
}

/** Presentation and server rendering policy for the layer's children. */
export interface OverlayPortalProps {
  layer: OverlayLayer
  presentation: 'host' | 'inline'
  server: 'inline' | 'omit'
  children: ReactNode
}

/** The presentation wrapper that handles backdrop activation for the layer. */
export type OverlayBackdropProps = Omit<BoxProps<ReactNode>, 'as' | 'onClick'> & {
  layer: OverlayLayer
}

/** The platform API shared by React DOM and React Native. */
export interface OverlayPlatform {
  OverlayHost(props: OverlayHostProps): ReactElement
  useOverlayLayer(options: OverlayLayerOptions): OverlayLayer
  OverlayPortal(props: OverlayPortalProps): ReactElement | null
  OverlayBackdrop(props: OverlayBackdropProps): ReactElement
  useViewportMatch(query: number | string): boolean
}
