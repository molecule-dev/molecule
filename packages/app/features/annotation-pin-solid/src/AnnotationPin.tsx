import { type Component, Show } from 'solid-js'

import { ResolveNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { reactStyleText } from '@molecule/app-ui-solid'

import type { AnnotationPinProps } from './types.js'

/**
 * A single pin marker (small circle with optional `label`) rendered at
 * an absolute position on its parent. Clicking the marker toggles its
 * popup (which shows the `note` body) via the `onClick` handler.
 *
 * Positioning is absolute relative to the nearest positioned ancestor —
 * callers must wrap the surface (image, canvas, map) in a
 * `position: relative` element. `AnnotationLayer` provides this
 * wrapper automatically.
 *
 * This is the Solid counterpart of `@molecule/app-annotation-pin-react`'s
 * `AnnotationPin`: the same props (React names), the same ClassMap tokens, the
 * same i18n keys, and the same DOM for the same input.
 *
 * @param props - Component props (see {@link AnnotationPinProps}).
 * @returns The rendered pin marker.
 */
export const AnnotationPin: Component<AnnotationPinProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  /** React's `selected = false` / `normalised = true` / `popupSide = 'right'` defaults. */
  const selected = (): boolean => props.selected ?? false
  const normalised = (): boolean => props.normalised ?? true
  const popupSide = (): 'top' | 'bottom' | 'left' | 'right' => props.popupSide ?? 'right'

  /**
   * The popup's side-specific inline style (React's `popupStyle`).
   *
   * @param side - The popup side.
   * @returns The inline style declarations.
   */
  const popupStyle = (side: string): Record<string, string | number> => {
    const base: Record<string, string | number> = {
      position: 'absolute',
      minWidth: '160px',
      maxWidth: '240px',
      padding: '8px',
      borderRadius: '4px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
      zIndex: '3',
    }
    switch (side) {
      case 'top':
        base.bottom = '100%'
        base.left = '50%'
        base.transform = 'translate(-50%, -8px)'
        break
      case 'bottom':
        base.top = '100%'
        base.left = '50%'
        base.transform = 'translate(-50%, 8px)'
        break
      case 'left':
        base.right = '100%'
        base.top = '50%'
        base.transform = 'translate(-8px, -50%)'
        break
      case 'right':
      default:
        base.left = '100%'
        base.top = '50%'
        base.transform = 'translate(8px, -50%)'
        break
    }
    return base
  }

  /**
   * Stops the marker click from bubbling to arbitrary ancestor click
   * handlers and forwards it to `onClick`.
   *
   * @param event - The originating mouse event.
   */
  const handleMarkerClick = (event: MouseEvent): void => {
    event.stopPropagation()
    props.onClick?.()
  }

  return (
    <div
      class={cm.cn(props.className)}
      data-mol-id="annotation-pin"
      data-pin-selected={selected() ? 'true' : 'false'}
      style={reactStyleText({
        position: 'absolute',
        left: normalised() ? `${props.position.x * 100}%` : `${props.position.x}px`,
        top: normalised() ? `${props.position.y * 100}%` : `${props.position.y}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: selected() ? '2' : '1',
      })}
    >
      <button
        type="button"
        onClick={handleMarkerClick}
        aria-label={t('annotationPin.aria.marker', {}, { defaultValue: 'Annotation pin' })}
        aria-expanded={selected() ? 'true' : 'false'}
        data-mol-id="annotation-pin-marker"
        /* mol-bespoke-button: a 24px circular map-style pin marker, not a CTA —
           React renders the same inline chrome (fixed 24×24 box, no border or
           padding, its own shadow), and the ClassMap supplies the radius and
           cursor as it does for React. */
        class={cm.cn(cm.roundedFull, cm.cursorPointer)}
        style={reactStyleText({
          width: '24px',
          height: '24px',
          border: 'none',
          padding: '0px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        })}
      >
        <span
          class={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))}
          data-mol-id="annotation-pin-label"
          style={reactStyleText({ lineHeight: '1', pointerEvents: 'none' })}
        >
          {props.label}
        </span>
      </button>
      <Show when={selected()}>
        <div
          role="dialog"
          aria-label={t('annotationPin.aria.popup', {}, { defaultValue: 'Annotation details' })}
          data-mol-id="annotation-pin-popup"
          data-popup-side={popupSide()}
          class={cm.cn(cm.surface, cm.borderAll, cm.textSize('sm'))}
          style={reactStyleText(popupStyle(popupSide()))}
        >
          <div data-mol-id="annotation-pin-popup-body">
            <ResolveNode node={props.note}>
              {(note, hasNote) => (
                <Show
                  when={hasNote()}
                  fallback={
                    <span data-mol-id="annotation-pin-popup-empty">
                      {t('annotationPin.empty', {}, { defaultValue: 'No notes for this pin.' })}
                    </span>
                  }
                >
                  {note()}
                </Show>
              )}
            </ResolveNode>
          </div>
        </div>
      </Show>
    </div>
  )
}
