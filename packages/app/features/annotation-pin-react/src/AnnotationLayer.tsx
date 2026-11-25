import type { JSX, MouseEvent, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { type BoxStyle, type CSSProperties, getClassMap } from '@molecule/app-ui'
import { Box, Pressable } from '@molecule/app-ui-react/elements'

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
   * `Pin.position` — normalised 0..1 by default. Keyboard users get the
   * same action: activating the layer's "add pin" button (Tab to it,
   * then Enter / Space) places a pin at the surface centre.
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
  /**
   * Inline style for the layer root (the framework-agnostic `CSSProperties` of
   * `@molecule/app-ui`). Applied after the layer's own `position: relative` and
   * `width`/`height: 100%`, so it can override them.
   */
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
 *   which callers typically use to add a new pin. That action lives on
 *   an invisible "add annotation pin" button covering the surface (the
 *   layer region itself is not interactive — it contains the pin
 *   buttons and popups): pointer clicks place a pin at the click
 *   position; activating the button with a keyboard (Tab to it, then
 *   Enter / Space) or assistive tech places a pin at the surface centre.
 *
 * The layer itself sets `position: relative` so absolute pin
 * positioning works without the caller having to provide a wrapper.
 *
 * All styling routes through `getClassMap()` (no Tailwind / raw class
 * names). All user-visible text routes through `t()` so the layer
 * translates via the companion
 * `@molecule/app-locales-annotation-pin` locale bond.
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
  const addPinLabel = t('annotationPin.aria.addPin', {}, { defaultValue: 'Add annotation pin' })

  const rootStyle: BoxStyle = {
    position: 'relative',
    width: '100%',
    height: '100%',
  }

  // Reset the browser's default button chrome — the add-pin button is an
  // invisible full-surface target, not a visible control. (ClassMap has no
  // reset tokens; the marker button uses the same inline resets.)
  const addPinStyle: CSSProperties = {
    border: 'none',
    padding: 0,
    background: 'transparent',
  }

  /**
   * Compute the clicked position relative to the add-pin button's box
   * (which covers the layer) and forward to `onSurfaceClick`. If
   * `normalised` is `true`, the returned coordinates are 0..1
   * fractions; otherwise they are raw pixel offsets.
   *
   * Clicks produced by keyboard activation (Enter / Space on the
   * focused button) or assistive tech carry `detail === 0` and no
   * pointer position — such clicks place the pin at the surface centre.
   * Pin markers and popups never reach this handler: they stack above
   * the button and are its siblings, so their clicks do not hit it.
   *
   * @param event - The originating mouse event.
   */
  function handleSurfaceClick(event: MouseEvent<HTMLButtonElement>): void {
    if (!onSurfaceClick) return
    const rect = event.currentTarget.getBoundingClientRect()
    const keyboardActivated = event.detail === 0
    const px = keyboardActivated ? rect.width / 2 : event.clientX - rect.left
    const py = keyboardActivated ? rect.height / 2 : event.clientY - rect.top
    const safeRectWidth = rect.width || 1
    const safeRectHeight = rect.height || 1
    const x = normalised ? px / safeRectWidth : px
    const y = normalised ? py / safeRectHeight : py
    onSurfaceClick({ x, y })
  }

  return (
    <Box
      as="div"
      role="region"
      aria-label={regionLabel}
      data-mol-id="annotation-layer"
      className={cm.cn(className)}
      style={rootStyle}
      // The caller's inline style comes last, so it overrides the layer's own sizing.
      webStyle={style}
    >
      {children}
      {onSurfaceClick && (
        <Pressable
          as="button"
          type="button"
          aria-label={addPinLabel}
          data-mol-id="annotation-layer-add-pin"
          onClick={handleSurfaceClick}
          className={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
          webStyle={addPinStyle}
        />
      )}
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
    </Box>
  )
}
