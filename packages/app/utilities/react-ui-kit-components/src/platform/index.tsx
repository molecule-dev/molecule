/**
 * React DOM implementation of the renderer-neutral overlay platform.
 * @module
 */

import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react'
import { createPortal } from 'react-dom'

import {
  domElement,
  measureOverlayPosition,
  OverlayLayer as DomOverlayLayer,
  readOverlayAnchorWidth,
} from '@molecule/app-overlay-dom'
import type {
  AnchoredPosition,
  OverlayLayer,
  OverlayPlatform,
  ToastMessageProps,
} from '@molecule/app-react/overlay'
import type { ElementHandle, OverlayLayerOptions, OverlayTarget } from '@molecule/app-ui'

import { Box } from '../elements/Box.js'
import { useElementLayoutEffect } from '../elements/viewport.js'

export { OverlayArrow } from './arrow.js'
export { focusStaysWithin } from '@molecule/app-overlay-dom'
export type * from '@molecule/app-react/overlay'
export type {
  OverlayAnchorGeometry,
  OverlayDismissReason,
  OverlayFocusOptions,
  OverlayLayerKind,
  OverlayLayerOptions,
  OverlayTarget,
} from '@molecule/app-ui'

const Owner = createContext<OverlayTarget | undefined>(undefined)
const Parent = createContext<DomOverlayLayer | undefined>(undefined)

/** The viewport and portal document belonging to a layer or host. */
function ownerDocument(anchor?: OverlayTarget, owner?: OverlayTarget): Document | undefined {
  return domElement(anchor?.current)?.ownerDocument ?? domElement(owner?.current)?.ownerDocument
}

/** The legacy document used by standalone components. */
function ambientDocument(): Document | undefined {
  return typeof document === 'undefined' ? undefined : document
}

/** Retains the owner document and committed options for an overlay token. */
class Registration {
  readonly layer = new DomOverlayLayer()
  private readonly listeners = new Set<() => void>()
  private portalDocument: Document | undefined

  constructor(
    private options: OverlayLayerOptions,
    private parent: DomOverlayLayer | undefined,
    owner: OverlayTarget | undefined,
  ) {
    this.portalDocument = ownerDocument(options.anchor, owner)
    if (!options.anchor && !owner) this.portalDocument ??= ambientDocument()
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readonly document = (): Document | undefined => this.portalDocument

  /** Applies each commit while keeping a still-open layer's original stack position. */
  update(
    options: OverlayLayerOptions,
    parent: DomOverlayLayer | undefined,
    owner: OverlayTarget | undefined,
  ): void {
    this.options = options
    this.parent = parent
    const next = ownerDocument(options.anchor, owner) ?? ambientDocument()
    if (this.portalDocument !== next) {
      this.portalDocument = next
      for (const listener of this.listeners) listener()
    }
    this.syncSurface()
  }

  /** Registers once the portal's surface exists in its real document. */
  syncSurface(): void {
    this.layer.sync(this.options, this.parent)
  }
}

const registrations = new WeakMap<OverlayLayer, Registration>()

/** Resolves a layer token issued by this renderer. */
function registration(layer: OverlayLayer): Registration {
  const entry = registrations.get(layer)
  if (!entry)
    throw new Error('OverlayPortal and OverlayBackdrop require a layer from useOverlayLayer')
  return entry
}

/** A host sets document ownership without introducing a DOM element. */
export const OverlayHost: OverlayPlatform['OverlayHost'] = ({ children, owner }) => {
  const inherited = useContext(Owner)
  return <Owner.Provider value={owner ?? inherited}>{children}</Owner.Provider>
}

/** Registers the layer's stable identity and publishes the options from each commit. */
export const useOverlayLayer: OverlayPlatform['useOverlayLayer'] = (options) => {
  const owner = useContext(Owner)
  const parent = useContext(Parent)
  const [layer] = useState(() => {
    const token = { token: Symbol() }
    registrations.set(token, new Registration(options, parent, owner))
    return token
  })
  const entry = registration(layer)
  useEffect(() => entry.update(options, parent, owner))
  useEffect(() => () => entry.layer.release(), [entry])
  return layer
}

/** An SSR render has no portal destination, even during hydration. */
function serverDocument(): null {
  return null
}

/** Renders into the owner document's body while retaining the declaring React context. */
export const OverlayPortal: OverlayPlatform['OverlayPortal'] = ({
  layer,
  presentation,
  server,
  children,
}) => {
  const entry = registration(layer)
  const doc = useSyncExternalStore(entry.subscribe, entry.document, serverDocument)
  useEffect(() => entry.syncSurface())
  const content = <Parent.Provider value={entry.layer}>{children}</Parent.Provider>
  if (doc === null) return server === 'inline' ? content : null
  if (presentation === 'inline') return content
  return doc?.body ? createPortal(content, doc.body) : null
}

/** The same presentation div handles a backdrop click and contains clicks on its children. */
export const OverlayBackdrop: OverlayPlatform['OverlayBackdrop'] = ({ layer, ...props }) => (
  <Box
    as="div"
    {...props}
    onClick={(event) => {
      if (event.target === event.currentTarget) registration(layer).layer.dismissBackdrop()
      else event.stopPropagation()
    }}
  />
)

/** Reads media queries from the owner's window or the standalone document. */
function mediaQuery(owner: OverlayTarget | undefined, query: string): MediaQueryList | undefined {
  const view = ownerDocument(undefined, owner)?.defaultView ?? ambientDocument()?.defaultView
  return typeof view?.matchMedia === 'function' ? view.matchMedia(query) : undefined
}

/** Evaluates CSS media queries in the host's window, with numeric queries in CSS pixels. */
export const useViewportMatch: OverlayPlatform['useViewportMatch'] = (query) => {
  const owner = useContext(Owner)
  const css = typeof query === 'number' ? `(min-width: ${query}px)` : query
  const [matches, setMatches] = useState(() => mediaQuery(owner, css)?.matches ?? false)
  useEffect(() => {
    const mq = mediaQuery(owner, css)
    setMatches(mq?.matches ?? false)
    if (!mq) return
    const onChange = (event: MediaQueryListEvent): void => setMatches(event.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [owner, css])
  return matches
}

/** Listens for actual browser history traversal, including traversal to an identical URL. */
export const useHistoryPop: OverlayPlatform['useHistoryPop'] = (onPop, target) => {
  const owner = useContext(Owner)
  useEffect(() => {
    const view = (ownerDocument(target, owner) ?? ambientDocument())?.defaultView
    view?.addEventListener('popstate', onPop)
    return () => view?.removeEventListener('popstate', onPop)
  }, [onPop, owner, target])
}

/** Measures a Tooltip before paint and defers Dropdown coordinates to its next frame. */
export const useAnchoredPosition: OverlayPlatform['useAnchoredPosition'] = ({
  open,
  anchor,
  surface,
  placement,
  align,
  offset,
  padding,
  collision,
  timing,
  matchAnchorWidth,
  contentKey,
}) => {
  const [sample, setSample] = useState<{
    surface: ElementHandle
    position: Omit<AnchoredPosition, 'anchorWidth'>
  }>()
  const [anchorWidth, setAnchorWidth] = useState<number>()
  useElementLayoutEffect(() => {
    const trigger = domElement(anchor.current)
    setAnchorWidth(
      open && matchAnchorWidth && trigger ? readOverlayAnchorWidth(trigger) : undefined,
    )
  })
  useElementLayoutEffect(() => {
    const trigger = domElement(anchor.current)
    const panel = domElement(surface)
    const view = trigger?.ownerDocument.defaultView
    if (!open || !trigger || !panel || !surface || !view) return
    const measure = (): void => {
      const position = measureOverlayPosition(trigger, panel, {
        placement,
        align,
        offset,
        padding,
        collision,
      })
      setSample({ surface, position: { ...position, ready: true } })
    }
    if (timing === 'layout') {
      measure()
      return
    }
    const frame = view.requestAnimationFrame(measure)
    return () => view.cancelAnimationFrame(frame)
  }, [open, anchor, surface, placement, align, offset, padding, collision, timing, contentKey])
  return open && sample && sample.surface === surface
    ? { ...sample.position, anchorWidth }
    : { top: 0, left: 0, placement, ready: open, anchorWidth }
}

/** Web assistive technology reads the toast's existing role and live attributes. */
export const ToastMessage = forwardRef<ElementHandle, Omit<ToastMessageProps, 'ref'>>(
  function ToastMessage({ spokenContent: _spokenContent, ...props }, ref) {
    return <Box as="div" {...props} ref={ref} />
  },
)

/** Web descriptions are attached to the trigger while the visible tooltip exists. */
export const useTooltipDescription: OverlayPlatform['useTooltipDescription'] = () => false
