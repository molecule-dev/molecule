/**
 * The types implemented by both React overlay adapters.
 * @module
 */

import type { ReactElement, ReactNode, Ref } from 'react'

import type {
  BoxProps,
  ElementHandle,
  KitFocusEvent,
  OverlayAnchorGeometry,
  OverlayLayerOptions,
  OverlayPosition,
  OverlayTarget,
  TooltipPlacement,
} from '@molecule/app-ui'

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
  /** Device portals defer input and accessibility until positioned. */
  anchorPosition?: AnchoredPosition
  children: ReactNode
}

/** The presentation wrapper that handles backdrop activation for the layer. */
export type OverlayBackdropProps = Omit<BoxProps<ReactNode>, 'as' | 'onClick'> & {
  layer: OverlayLayer
}

/** Committed targets and update policy for positioning an anchored overlay. */
export interface AnchoredPositionOptions extends OverlayAnchorGeometry {
  layer: OverlayLayer
  open: boolean
  anchor: OverlayTarget
  surface: ElementHandle | null
  timing: 'layout' | 'frame'
  matchAnchorWidth?: boolean
  /** A device menu can present an accessible list when its anchor cannot be used. */
  listFallback?: boolean
  /** Changes when content may have changed the surface dimensions. */
  contentKey?: unknown
}

/** Current surface position and optional untransformed layout width of its anchor. */
export interface AnchoredPosition extends OverlayPosition {
  /** The surface can receive input and focus in its current presentation. */
  ready: boolean
  anchorWidth?: number
  fallback?: boolean
}

/** Root of one presented toast. */
export type ToastMessageProps = Omit<BoxProps<ReactNode>, 'as'> & {
  ref?: Ref<ElementHandle>
  /** Text or accessible label to announce on device. */
  spokenContent?: ReactNode
}

/** The platform API shared by React DOM and React Native. */
export interface OverlayPlatform {
  OverlayHost(props: OverlayHostProps): ReactElement
  useOverlayLayer(options: OverlayLayerOptions): OverlayLayer
  OverlayPortal(props: OverlayPortalProps): ReactElement | null
  OverlayBackdrop(props: OverlayBackdropProps): ReactElement
  useViewportMatch(query: number | string): boolean
  useHistoryPop(onPop: () => void, target?: OverlayTarget): void
  useAnchoredPosition(options: AnchoredPositionOptions): AnchoredPosition
  useTooltipDescription(id: string, content: ReactNode): boolean
  OverlayArrow(props: { placement: TooltipPlacement }): ReactElement
  ToastMessage(props: ToastMessageProps): ReactElement
  focusStaysWithin(event: KitFocusEvent): boolean
}
