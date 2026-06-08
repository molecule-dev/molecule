import type { CSSProperties, JSX, MouseEvent, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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
 * `@molecule/app-locales-feature-annotation-pin-react` locale bond.
 *
 * @param props - Component props.
 * @returns The pin element.
 */
export function AnnotationPin(props: AnnotationPinProps): JSX.Element {
  const {
    position,
    label,
    note,
    selected,
    onClick,
    popupSide = 'right',
    className,
    normalised = true,
  } = props
  const cm = getClassMap()
  const { t } = useTranslation()

  const markerLabel = t('annotationPin.aria.marker', {}, { defaultValue: 'Annotation pin' })
  const popupLabel = t('annotationPin.aria.popup', {}, { defaultValue: 'Annotation details' })
  const emptyNote = t('annotationPin.empty', {}, { defaultValue: 'No notes for this pin.' })

  const x = normalised ? `${position.x * 100}%` : `${position.x}px`
  const y = normalised ? `${position.y * 100}%` : `${position.y}px`

  const wrapperStyle: CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    transform: 'translate(-50%, -50%)',
    zIndex: selected ? 2 : 1,
  }

  const markerStyle: CSSProperties = {
    width: 24,
    height: 24,
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
  }

  const popupStyle: CSSProperties = {
    position: 'absolute',
    minWidth: 160,
    maxWidth: 240,
    padding: 8,
    borderRadius: 4,
    boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
    zIndex: 3,
  }
  switch (popupSide) {
    case 'top':
      popupStyle.bottom = '100%'
      popupStyle.left = '50%'
      popupStyle.transform = 'translate(-50%, -8px)'
      break
    case 'bottom':
      popupStyle.top = '100%'
      popupStyle.left = '50%'
      popupStyle.transform = 'translate(-50%, 8px)'
      break
    case 'left':
      popupStyle.right = '100%'
      popupStyle.top = '50%'
      popupStyle.transform = 'translate(-8px, -50%)'
      break
    case 'right':
    default:
      popupStyle.left = '100%'
      popupStyle.top = '50%'
      popupStyle.transform = 'translate(8px, -50%)'
      break
  }

  /**
   * Stop the marker click from bubbling — `<AnnotationLayer>` listens for
   * surface clicks on the wrapper, so the pin's own click would
   * otherwise also register as a "place new pin" event.
   *
   * @param event - The originating mouse event.
   */
  function handleMarkerClick(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation()
    if (onClick) onClick()
  }

  /**
   * Stop popup clicks from reaching the layer surface as well — clicking
   * inside the popup body should not place a new pin.
   *
   * @param event - The originating mouse event.
   */
  function handlePopupClick(event: MouseEvent<HTMLDivElement>): void {
    event.stopPropagation()
  }

  return (
    <div
      className={cm.cn(className)}
      data-mol-id="annotation-pin"
      data-pin-selected={selected ? 'true' : 'false'}
      style={wrapperStyle}
    >
      <button
        type="button"
        onClick={handleMarkerClick}
        aria-label={markerLabel}
        aria-expanded={selected ? 'true' : 'false'}
        data-mol-id="annotation-pin-marker"
        className={cm.cn(cm.roundedFull, cm.cursorPointer)}
        style={markerStyle}
      >
        <span
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))}
          data-mol-id="annotation-pin-label"
          style={{ lineHeight: 1, pointerEvents: 'none' }}
        >
          {label}
        </span>
      </button>
      {selected && (
        <div
          role="dialog"
          aria-label={popupLabel}
          data-mol-id="annotation-pin-popup"
          data-popup-side={popupSide}
          onClick={handlePopupClick}
          className={cm.cn(cm.surface, cm.borderAll, cm.textSize('sm'))}
          style={popupStyle}
        >
          <div data-mol-id="annotation-pin-popup-body">
            {note ?? <span data-mol-id="annotation-pin-popup-empty">{emptyNote}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
