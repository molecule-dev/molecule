import { type Component, For, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { AnnotationPin } from './AnnotationPin.jsx'
import { styleString } from './css.js'
import type { AnnotationLayerProps } from './types.js'

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
 * This is the Solid counterpart of `@molecule/app-annotation-pin-react`'s
 * `AnnotationLayer`: the same props (React names), the same ClassMap tokens,
 * the same i18n keys, and the same DOM for the same input.
 *
 * @param props - Component props (see {@link AnnotationLayerProps}).
 * @returns The rendered annotation layer.
 */
export const AnnotationLayer: Component<AnnotationLayerProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  /** React's `normalised = true` / `popupSide = 'right'` defaults. */
  const normalised = (): boolean => props.normalised ?? true
  const popupSide = (): 'top' | 'bottom' | 'left' | 'right' => props.popupSide ?? 'right'

  /**
   * Computes the clicked position relative to the add-pin button's box
   * (which covers the layer) and forwards to `onSurfaceClick`. If
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
  const handleSurfaceClick = (event: MouseEvent): void => {
    if (!props.onSurfaceClick) return
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const keyboardActivated = event.detail === 0
    const px = keyboardActivated ? rect.width / 2 : event.clientX - rect.left
    const py = keyboardActivated ? rect.height / 2 : event.clientY - rect.top
    const safeRectWidth = rect.width || 1
    const safeRectHeight = rect.height || 1
    const x = normalised() ? px / safeRectWidth : px
    const y = normalised() ? py / safeRectHeight : py
    props.onSurfaceClick({ x, y })
  }

  return (
    <div
      role="region"
      aria-label={t('annotationPin.aria.layer', {}, { defaultValue: 'Annotation layer' })}
      data-mol-id="annotation-layer"
      class={cm.cn(props.className)}
      style={styleString({
        position: 'relative',
        width: '100%',
        height: '100%',
        ...(props.style ?? {}),
      })}
    >
      {props.children}
      <Show when={props.onSurfaceClick}>
        <button
          type="button"
          aria-label={t('annotationPin.aria.addPin', {}, { defaultValue: 'Add annotation pin' })}
          data-mol-id="annotation-layer-add-pin"
          onClick={handleSurfaceClick}
          /* mol-bespoke-button: an invisible full-surface hit target, not a
             visible control — React resets the browser button chrome the same
             way; no label, no fill, cursor from the ClassMap. */
          class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
          // Reset the browser's default button chrome — the add-pin button is
          // an invisible full-surface target, not a visible control.
          style={styleString({ border: 'none', padding: '0px', background: 'transparent' })}
        />
      </Show>
      <For each={props.pins}>
        {(pin) => (
          <AnnotationPin
            position={pin.position}
            label={pin.label}
            note={pin.note}
            selected={props.activePinId === pin.id}
            popupSide={popupSide()}
            normalised={normalised()}
            onClick={() => props.onPinClick?.(pin.id)}
          />
        )}
      </For>
    </div>
  )
}
