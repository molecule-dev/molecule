<!--
  ResizeHandle: the Svelte counterpart of `@molecule/app-ide-react`'s
  `ResizeHandle` — the drag sash between panels. Same props (React names), same
  DOM for the same input. Pointer Events drive the drag (mouse, touch, pen
  alike) with the pointer captured so moves keep arriving when the cursor
  leaves the handle; a wide invisible grab zone wraps a thin visible line that
  brightens to the primary color on hover or drag; the arrow keys nudge the
  split. A focusable separator is the WAI-ARIA window-splitter pattern, so it
  reports the leading pane's share of the two panes it divides (`value`)
  through `aria-valuenow`, with the `0`–`100` range. See the React file for the design notes.

  The hover highlight binds to `pointerover`/`pointerout` — the boundary pair a
  browser delivers when the pointer enters or leaves the handle, and the events
  React itself derives `onPointerEnter`/`onPointerLeave` from — so a crossing
  INTO the wrapped line (`pointerout` with the pointer still inside) reads as
  staying, not leaving.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are geometry
  the ClassMap can't express, written as style texts. All user-facing text goes
  through `t()`.
-->

<script module lang="ts">
  import type { ResizeHandleProps } from '@molecule/app-ide-panel-logic'
  import { useTranslation } from '@molecule/app-svelte'
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
</script>

<script lang="ts">
  let {
    onResize,
    direction = 'horizontal',
    className,
    value,
  }: ResizeHandleProps & { value: number } = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  const horizontal = $derived(direction === 'horizontal')
  // The drag state is both the render's highlight and the move handler's guard
  // (a `$state` for the view, a plain flag for the guard, exactly React's
  // `dragging` state + `draggingRef`).
  let dragging = $state(false)
  let draggingLive = false
  let hovered = $state(false)
  let start = 0

  const highlighted = $derived(dragging || hovered)
  const lineThickness = $derived(highlighted ? `${LINE_ACTIVE_PX}px` : `${LINE_PX}px`)
  const rootStyle = $derived(
    horizontal
      ? `cursor: col-resize; touch-action: none; position: relative; z-index: 1; width: ${GRAB_PX}px; height: 100%; margin-left: ${-(GRAB_PX - LINE_PX) / 2}px; margin-right: ${-(GRAB_PX - LINE_PX) / 2}px`
      : `cursor: row-resize; touch-action: none; position: relative; z-index: 1; width: 100%; height: ${GRAB_PX}px; margin-top: ${-(GRAB_PX - LINE_PX) / 2}px; margin-bottom: ${-(GRAB_PX - LINE_PX) / 2}px`,
  )
  const lineStyle = $derived(
    `width: ${horizontal ? lineThickness : '100%'}; height: ${horizontal ? '100%' : lineThickness}; border-radius: 9999px; transition: background-color 150ms ease, width 150ms ease, height 150ms ease`,
  )

  /**
   * Starts a drag: remembers the pointer, captures it so moves keep firing when
   * the cursor leaves the handle, and pins the page against scroll and text
   * selection while the drag is on.
   *
   * @param event - The native pointer event.
   */
  function onPointerDown(event: PointerEvent): void {
    event.preventDefault()
    draggingLive = true
    dragging = true
    start = horizontal ? event.clientX : event.clientY
    const el = event.currentTarget as HTMLDivElement
    el.setPointerCapture(event.pointerId)
    document.body.style.cursor = horizontal ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
  }

  /**
   * Drags: every move calls `onResize` with the pixels moved since the last
   * move (a move that lands where the last one did is no move at all).
   *
   * @param event - The native pointer event.
   */
  function onPointerMove(event: PointerEvent): void {
    if (!draggingLive) return
    const current = horizontal ? event.clientX : event.clientY
    const delta = current - start
    if (delta === 0) return
    start = current
    onResize(delta)
  }

  /**
   * Ends a drag (release or cancel), lets the capture go and restores the page
   * the way the drag start found it.
   *
   * @param event - The native pointer event.
   */
  function endDrag(event: PointerEvent): void {
    if (!draggingLive) return
    draggingLive = false
    dragging = false
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
  function onKeyDown(event: KeyboardEvent): void {
    const decreaseKey = horizontal ? 'ArrowLeft' : 'ArrowUp'
    const increaseKey = horizontal ? 'ArrowRight' : 'ArrowDown'
    if (event.key === decreaseKey) {
      event.preventDefault()
      onResize(-KEYBOARD_STEP_PX)
    } else if (event.key === increaseKey) {
      event.preventDefault()
      onResize(KEYBOARD_STEP_PX)
    }
  }

  /**
   * Highlights the line while the pointer is over the handle (a crossing into
   * the wrapped line is not a leave — see the module note).
   *
   * @param event - The native pointer event.
   */
  function onPointerOver(event: PointerEvent): void {
    const el = event.currentTarget as HTMLDivElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    hovered = true
  }

  /**
   * Restores the line once the pointer has actually left the handle.
   *
   * @param event - The native pointer event.
   */
  function onPointerOut(event: PointerEvent): void {
    const el = event.currentTarget as HTMLDivElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    hovered = false
  }
</script>

<!-- A focusable separator IS the WAI-ARIA resizer pattern: the handle is
    keyboard-operable by design (the arrow keys nudge the split) and reports the
    leading pane's share through `aria-valuenow`, which a focusable separator
    requires. Svelte's a11y linter does not recognize the non-widget `separator`
    role, so the DOM stays React's (`role="separator"`, `tabindex="0"`). -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  data-mol-id="workspace-resize-handle"
  role="separator"
  aria-orientation={horizontal ? 'vertical' : 'horizontal'}
  aria-label={t('ide.resizeHandle.label', undefined, { defaultValue: 'Resize panels' })}
  aria-valuenow={Math.round(value)}
  aria-valuemin="0"
  aria-valuemax="100"
  tabindex="0"
  class={cm.cn(
    cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
    cm.shrink0,
    className,
  )}
  style={rootStyle}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={endDrag}
  onpointercancel={endDrag}
  onpointerover={onPointerOver}
  onpointerout={onPointerOut}
  onkeydown={onKeyDown}
>
  <div
    aria-hidden="true"
    class={cm.cn(highlighted ? cm.bgPrimary : cm.bgBorder)}
    style={lineStyle}
  ></div>
</div>
