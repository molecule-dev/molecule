import type { JSX, MouseEvent, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { type BoxStyle, type CSSProperties, getClassMap } from '@molecule/app-ui'
import { Box, Pressable, Text } from '@molecule/app-ui-react/elements'

/**
 * A single pin to display on a parent surface. `position` is in the
 * parent's coordinate space — for image / 2D-canvas overlays this is
 * normalised 0..1 (so the pin re-anchors as the surface resizes); for
 * pixel-positioned overlays callers can pass raw px values and provide
 * their own `style` overrides via `className`.
 *
 * The label/note are pure data — components handle render only. Surfaces
 * supply pin objects via `<AnnotationLayer pins={...}>` (or render a
 * single pin directly if there is only one).
 */
export interface Pin {
  /** Stable identifier (used as React key). */
  id: string
  /** Position in the parent surface's coordinate space (typically normalised 0..1). */
  position: { x: number; y: number }
  /** Short label (e.g. an index or single-word tag) shown inside the pin marker. */
  label?: ReactNode
  /** Longer note / description body, shown inside the popup when the pin is selected. */
  note?: ReactNode
}

/**
 * `<AnnotationPin>` props.
 */
export interface AnnotationPinProps {
  /** Position in the parent surface's coordinate space (typically normalised 0..1). */
  position: { x: number; y: number }
  /** Short label (e.g. an index or single-word tag) shown inside the marker. */
  label?: ReactNode
  /** Longer note shown inside the popup when the pin is selected. */
  note?: ReactNode
  /**
   * Whether the pin is currently selected. When `true` the popup is
   * rendered. Selection is controlled — callers manage state in
   * `<AnnotationLayer>` (or themselves) and update via `onClick`.
   */
  selected?: boolean
  /** Click handler — fires when the pin marker is clicked. */
  onClick?: () => void
  /**
   * Side the popup renders on, relative to the marker. Defaults to `'right'`.
   */
  popupSide?: 'top' | 'bottom' | 'left' | 'right'
  /** Extra classes merged onto the root wrapper. */
  className?: string
  /**
   * Whether `position` is normalised (0..1) — when `true` the wrapper
   * positions itself with `%` units so pins re-anchor on resize. When
   * `false` the wrapper uses raw `px` values. Defaults to `true`.
   */
  normalised?: boolean
}

/**
 * A single pin marker (small circle with optional `label`) rendered at
 * an absolute position on its parent. Clicking the marker toggles its
 * popup (which shows the `note` body) via the `onClick` handler.
 *
 * Positioning is absolute relative to the nearest positioned ancestor —
 * callers must wrap the surface (image, canvas, map) in a
 * `position: relative` element. `<AnnotationLayer>` provides this
 * wrapper automatically.
 *
 * All styling routes through `getClassMap()` (no Tailwind / raw class
 * names). All user-visible text (aria-labels, fallback note text)
 * routes through `t()` so the marker translates via the companion
 * `@molecule/app-locales-annotation-pin` locale bond.
 *
 * @param props - Component props.
 * @returns The pin element.
 */
export function AnnotationPin(props: AnnotationPinProps): JSX.Element {
  const {
    position,
    label,
    note: noteProp,
    selected,
    onClick,
    popupSide = 'right',
    className,
    normalised = true,
  } = props
  const note = slot(noteProp)
  const cm = getClassMap()
  const { t } = useTranslation()

  const markerLabel = t('annotationPin.aria.marker', {}, { defaultValue: 'Annotation pin' })
  const popupLabel = t('annotationPin.aria.popup', {}, { defaultValue: 'Annotation details' })
  const emptyNote = t('annotationPin.empty', {}, { defaultValue: 'No notes for this pin.' })

  const x = normalised ? `${position.x * 100}%` : `${position.x}px`
  const y = normalised ? `${position.y * 100}%` : `${position.y}px`

  // Layout both renderers apply goes in `style`; CSS only a browser draws
  // (transforms, shadows, the button's chrome reset) in `webStyle`.
  const wrapperStyle: BoxStyle = {
    position: 'absolute',
    zIndex: selected ? 2 : 1,
  }
  const wrapperWebStyle: CSSProperties = {
    left: x,
    top: y,
    transform: 'translate(-50%, -50%)',
  }

  const markerStyle: BoxStyle = {
    width: 24,
    height: 24,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
  }
  const markerWebStyle: CSSProperties = {
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
  }

  const popupStyle: BoxStyle = {
    position: 'absolute',
    minWidth: 160,
    maxWidth: 240,
    padding: 8,
    borderRadius: 4,
    zIndex: 3,
  }
  const popupWebStyle: CSSProperties = {
    boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
  }
  switch (popupSide) {
    case 'top':
      popupStyle.bottom = '100%'
      popupStyle.left = '50%'
      popupWebStyle.transform = 'translate(-50%, -8px)'
      break
    case 'bottom':
      popupStyle.top = '100%'
      popupStyle.left = '50%'
      popupWebStyle.transform = 'translate(-50%, 8px)'
      break
    case 'left':
      popupStyle.right = '100%'
      popupStyle.top = '50%'
      popupWebStyle.transform = 'translate(-8px, -50%)'
      break
    case 'right':
    default:
      popupStyle.left = '100%'
      popupStyle.top = '50%'
      popupWebStyle.transform = 'translate(8px, -50%)'
      break
  }

  /**
   * Stop the marker click from bubbling to arbitrary ancestor click
   * handlers (a caller may render the pin standalone inside a clickable
   * container). `<AnnotationLayer>` needs no extra guarding: its
   * "add pin" surface button sits below the pin markers in stacking
   * order, so a marker click never reaches it.
   *
   * @param event - The originating mouse event.
   */
  function handleMarkerClick(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation()
    if (onClick) onClick()
  }

  return (
    <Box
      as="div"
      className={cm.cn(className)}
      data-mol-id="annotation-pin"
      data-pin-selected={selected ? 'true' : 'false'}
      style={wrapperStyle}
      webStyle={wrapperWebStyle}
    >
      <Pressable
        as="button"
        type="button"
        onClick={handleMarkerClick}
        aria-label={markerLabel}
        aria-expanded={!!selected}
        data-mol-id="annotation-pin-marker"
        className={cm.cn(cm.roundedFull, cm.cursorPointer)}
        style={markerStyle}
        webStyle={markerWebStyle}
      >
        <Text
          as="span"
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))}
          data-mol-id="annotation-pin-label"
          style={{ pointerEvents: 'none' }}
          webStyle={{ lineHeight: 1 }}
        >
          {label}
        </Text>
      </Pressable>
      {selected && (
        <Box
          as="div"
          role="dialog"
          aria-label={popupLabel}
          data-mol-id="annotation-pin-popup"
          data-popup-side={popupSide}
          className={cm.cn(cm.surface, cm.borderAll, cm.textSize('sm'))}
          style={popupStyle}
          webStyle={popupWebStyle}
        >
          <Box as="div" data-mol-id="annotation-pin-popup-body">
            {note ?? (
              <Text as="span" data-mol-id="annotation-pin-popup-empty">
                {emptyNote}
              </Text>
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
}
