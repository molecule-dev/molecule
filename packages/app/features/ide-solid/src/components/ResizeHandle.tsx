/**
 * Drag handle for resizing panels.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `ResizeHandle` (see that
 * file for the design notes): the same props (React names), the same DOM for
 * the same input, the same callbacks. Pointer Events drive the drag (mouse,
 * touch, pen alike) with the pointer captured so moves keep arriving when the
 * cursor leaves the handle; a wide invisible grab zone wraps a thin visible
 * line that brightens to the primary color on hover or drag; the arrow keys
 * nudge the split.
 *
 * The hover highlight binds to `pointerover`/`pointerout` — the boundary pair
 * a browser delivers when the pointer enters or leaves the handle, and the
 * events React itself derives `onPointerEnter`/`onPointerLeave` from — so a
 * crossing INTO the wrapped line (`pointerout` with the pointer still inside)
 * reads as staying, not leaving.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are geometry
 * the ClassMap can't express (Solid's style objects take kebab-case keys).
 * All user-facing text goes through `t()`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createSignal } from 'solid-js'

import type { ResizeHandleProps } from '@molecule/app-ide-panel-logic'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

/**
 * Width (px) of the invisible grab zone — far wider than the visible line so it
 * is a comfortable target for both a mouse and a finger (WCAG 2.5.5).
 */
const GRAB_PX = 11
/** Visible line thickness (px) at rest. */
const LINE_PX = 1
/** Visible line thickness (px) while hovered or actively dragging. */
const LINE_ACTIVE_PX = 3
/** Pixels moved per arrow-key press for keyboard resize. */
const KEYBOARD_STEP_PX = 24

/** Props for {@link ResizeHandle}: the shared contract plus the pane geometry. */
export interface ResizeHandleComponentProps extends ResizeHandleProps {
  /**
   * The size, in percent, of the pane BEFORE the handle within the two panes it
   * divides (`lead / (lead + trail) * 100`). A focusable `role="separator"` is
   * the WAI-ARIA window-splitter pattern, which requires `aria-valuenow`.
   */
  value: number
}

/**
 * Draggable handle for resizing adjacent panels: it splits two panels along
 * `direction` and reports every drag move through `onResize`. The separator
 * reports `value` through `aria-valuenow` with the `0`–`100` range.
 *
 * @param props - See {@link ResizeHandleComponentProps}.
 * @returns The rendered resize handle element.
 */
export function ResizeHandle(props: ResizeHandleComponentProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isHorizontal = (): boolean => (props.direction ?? 'horizontal') === 'horizontal'
  // The drag state is both the render's highlight and the move handler's guard
  // (a signal for the view, a plain flag for the guard, exactly React's
  // `dragging` state + `draggingRef`).
  const [dragging, setDragging] = createSignal(false)
  let draggingLive = false
  const [hovered, setHovered] = createSignal(false)
  let start = 0

  /**
   * Starts a drag: remembers the pointer, captures it so moves keep firing
   * when the cursor leaves the handle, and pins the page against scroll and
   * text selection while the drag is on.
   *
   * @param event - The native pointer event.
   */
  const onPointerDown = (event: PointerEvent): void => {
    event.preventDefault()
    draggingLive = true
    setDragging(true)
    start = isHorizontal() ? event.clientX : event.clientY
    const el = event.currentTarget as HTMLDivElement
    el.setPointerCapture(event.pointerId)
    document.body.style.cursor = isHorizontal() ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
  }

  /**
   * Drags: every move calls `onResize` with the pixels moved since the last
   * move (a move that lands where the last one did is no move at all).
   *
   * @param event - The native pointer event.
   */
  const onPointerMove = (event: PointerEvent): void => {
    if (!draggingLive) return
    const current = isHorizontal() ? event.clientX : event.clientY
    const delta = current - start
    if (delta === 0) return
    start = current
    props.onResize(delta)
  }

  /**
   * Ends a drag (release or cancel), lets the capture go and restores the page
   * the way the drag start found it.
   *
   * @param event - The native pointer event.
   */
  const endDrag = (event: PointerEvent): void => {
    if (!draggingLive) return
    draggingLive = false
    setDragging(false)
    const el = event.currentTarget as HTMLDivElement
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  /**
   * Keyboard resize: the arrows nudge along the handle's axis (left/up shrink,
   * right/down grow); every other key passes through untouched.
   *
   * @param event - The native keyboard event.
   */
  const onKeyDown = (event: KeyboardEvent): void => {
    const decreaseKey = isHorizontal() ? 'ArrowLeft' : 'ArrowUp'
    const increaseKey = isHorizontal() ? 'ArrowRight' : 'ArrowDown'
    if (event.key === decreaseKey) {
      event.preventDefault()
      props.onResize(-KEYBOARD_STEP_PX)
    } else if (event.key === increaseKey) {
      event.preventDefault()
      props.onResize(KEYBOARD_STEP_PX)
    }
  }

  /**
   * Highlights the line while the pointer is over the handle (a crossing into
   * the wrapped line is not a leave — see the module note).
   *
   * @param event - The native pointer event.
   */
  const onPointerOver = (event: PointerEvent): void => {
    const el = event.currentTarget as HTMLDivElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    setHovered(true)
  }

  /**
   * Restores the line once the pointer has actually left the handle.
   *
   * @param event - The native pointer event.
   */
  const onPointerOut = (event: PointerEvent): void => {
    const el = event.currentTarget as HTMLDivElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    setHovered(false)
  }

  const highlighted = (): boolean => dragging() || hovered()
  const lineThickness = (): string => (highlighted() ? `${LINE_ACTIVE_PX}px` : `${LINE_PX}px`)

  return (
    <div
      data-mol-id="workspace-resize-handle"
      role="separator"
      aria-orientation={isHorizontal() ? 'vertical' : 'horizontal'}
      aria-label={t('ide.resizeHandle.label', undefined, { defaultValue: 'Resize panels' })}
      aria-valuenow={Math.round(props.value)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabindex={0}
      class={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.shrink0,
        props.className,
      )}
      style={
        isHorizontal()
          ? {
              cursor: 'col-resize',
              'touch-action': 'none',
              position: 'relative',
              'z-index': '1',
              width: `${GRAB_PX}px`,
              height: '100%',
              'margin-left': `${-(GRAB_PX - LINE_PX) / 2}px`,
              'margin-right': `${-(GRAB_PX - LINE_PX) / 2}px`,
            }
          : {
              cursor: 'row-resize',
              'touch-action': 'none',
              position: 'relative',
              'z-index': '1',
              width: '100%',
              height: `${GRAB_PX}px`,
              'margin-top': `${-(GRAB_PX - LINE_PX) / 2}px`,
              'margin-bottom': `${-(GRAB_PX - LINE_PX) / 2}px`,
            }
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onKeyDown={onKeyDown}
    >
      {/* Thin visible line, centered in the grab zone. Background comes from a
          ClassMap token (not inline) so the theme controls the color and the
          hover/active state swaps token rather than fighting CSS specificity. */}
      <div
        aria-hidden="true"
        class={cm.cn(highlighted() ? cm.bgPrimary : cm.bgBorder)}
        style={{
          width: isHorizontal() ? lineThickness() : '100%',
          height: isHorizontal() ? '100%' : lineThickness(),
          'border-radius': '9999px',
          transition: 'background-color 150ms ease, width 150ms ease, height 150ms ease',
        }}
      />
    </div>
  )
}
