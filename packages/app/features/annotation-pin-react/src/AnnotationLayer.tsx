import type { CSSProperties, JSX, MouseEvent, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AnnotationPin, type Pin } from './AnnotationPin.js'

/**
 * `<AnnotationLayer>` props.
 */
export interface AnnotationLayerProps {
  /** Pins to render on the layer. */
  pins: Pin[]
  /** Optional layer content (the surface to annotate — image, canvas, map tile, etc.). */
  children?: ReactNode
  /**
   * The currently active (popup-open) pin id, or `null` for none. The
   * layer is fully controlled — callers manage selection state.
   */
  activePinId?: string | null
  /** Called with the clicked pin id when a pin marker is clicked. */
  onPinClick?: (pinId: string) => void
  /**
   * Called when the user clicks an empty area of the layer (i.e. not on
   * a pin marker or a popup). Coordinates are in the same space as
   * `Pin.position` — normalised 0..1 by default.
   */
  onSurfaceClick?: (position: { x: number; y: number }) => void
  /**
   * Whether positions are normalised (0..1) — when `true` the layer
   * computes click coordinates as fractions of its bounding box; when
   * `false` it returns raw pixel offsets. Defaults to `true`.
   */
  normalised?: boolean
  /**
   * Side the popup renders on, relative to its marker. Defaults to `'right'`.
   */
  popupSide?: 'top' | 'bottom' | 'left' | 'right'
  /** Extra classes merged onto the layer root. */
  className?: string
  /** Inline style for the layer root. */
  style?: CSSProperties
}

/**
 * Wrapper that manages multiple pins on a parent surface. Renders its
 * `children` (the surface — typically an `<img>`, `<canvas>`, or
 * map-tile element) and overlays each `pins[]` entry as a clickable
 * `<AnnotationPin>` marker.
 *
 * Click behaviour:
 * - clicking a pin marker fires `onPinClick(pinId)`
 * - clicking empty space on the layer fires `onSurfaceClick({ x, y })`,
 *   which callers typically use to add a new pin
 *
 * The layer itself sets `position: relative` so absolute pin
 * positioning works without the caller having to provide a wrapper.
 *
 * All styling routes through `getClassMap()` (no Tailwind / raw class
 * names). All user-visible text routes through `t()` so the layer
 * translates via the companion
 * `@molecule/app-locales-feature-annotation-pin-react` locale bond.
 *
 * @param props - Component props.
 * @returns The annotation-layer element.
 */
export function AnnotationLayer(props: AnnotationLayerProps): JSX.Element {
  const {
    pins,
    children,
    activePinId,
    onPinClick,
    onSurfaceClick,
    normalised = true,
    popupSide = 'right',
    className,
    style,
  } = props
  const cm = getClassMap()
  const { t } = useTranslation()

  const regionLabel = t('annotationPin.aria.layer', {}, { defaultValue: 'Annotation layer' })

  const rootStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    ...style,
  }

  /**
   * Compute the click position relative to the layer's bounding box
   * and forward to `onSurfaceClick`. If `normalised` is `true`, the
   * returned coordinates are 0..1 fractions; otherwise they are raw
   * pixel offsets.
   *
   * @param event - The originating mouse event.
   */
  function handleSurfaceClick(event: MouseEvent<HTMLDivElement>): void {
    if (!onSurfaceClick) return
    // Ignore clicks bubbling from inside pin markers / popups —
    // `<AnnotationPin>` already calls `stopPropagation()` for us, but
    // a defensive currentTarget check keeps surface clicks honest.
    if (event.target !== event.currentTarget) {
      // Allow direct child wrappers to bubble (children prop), but not
      // the absolutely-positioned pin nodes which set their own data-mol-id.
      const target = event.target as HTMLElement
      if (target.closest('[data-mol-id="annotation-pin"]')) return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - rect.left
    const py = event.clientY - rect.top
    const safeRectWidth = rect.width || 1
    const safeRectHeight = rect.height || 1
    const x = normalised ? px / safeRectWidth : px
    const y = normalised ? py / safeRectHeight : py
    onSurfaceClick({ x, y })
  }

  return (
    <div
      role="region"
      aria-label={regionLabel}
      data-mol-id="annotation-layer"
      onClick={handleSurfaceClick}
      className={cm.cn(className)}
      style={rootStyle}
    >
      {children}
      {pins.map((pin) => (
        <AnnotationPin
          key={pin.id}
          position={pin.position}
          label={pin.label}
          note={pin.note}
          selected={activePinId === pin.id}
          popupSide={popupSide}
          normalised={normalised}
          onClick={() => onPinClick?.(pin.id)}
        />
      ))}
    </div>
  )
}
