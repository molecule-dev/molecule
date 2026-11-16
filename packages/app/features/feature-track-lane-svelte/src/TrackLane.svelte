<!--
  TrackLane: the Svelte counterpart of `@molecule/app-feature-track-lane-react`'s
  `TrackLane` — one row of a multi-track timeline with draggable + resizable clip
  blocks on a `pixelsPerSecond` time axis. Same props (React names), same DOM for
  the same input, same callback calls; every visible string comes from
  `useTranslation()` so a locale switch re-renders it.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import {
    clampClipMove,
    clipToPixels,
    DRAG_DISTANCE_THRESHOLD_PX,
    MIN_CLIP_DURATION_SECONDS,
    pixelsToTime,
  } from './geometry.js'
  import type { Clip, TrackLaneProps } from './types.js'

  let {
    name,
    clips,
    pixelsPerSecond,
    lane,
    height,
    onClipMove,
    onClipResize,
    onClipClick,
    selectedClipId,
    className,
  }: TrackLaneProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /** The pointer state of the drag in progress, or null. */
  interface DragState {
    clipId: string
    mode: 'move' | 'resize'
    pointerId: number
    startX: number
    originStartTime: number
    originDuration: number
    moved: boolean
  }

  let drag: DragState | null = null

  const scale = $derived(pixelsPerSecond ?? 20)
  const rowHeight = $derived(height ?? 44)
  const laneLabel = $derived(
    t(
      'trackLane.aria.lane',
      { name: typeof name === 'string' ? name : '' },
      { defaultValue: 'Track lane {{name}}' },
    ),
  )
  const headerLabel = $derived(t('trackLane.header', {}, { defaultValue: 'Track' }))
  const resizeLabel = $derived(t('trackLane.aria.resize', {}, { defaultValue: 'Resize clip' }))

  /**
   * The translated aria label of one clip (its label, or its id).
   *
   * @param clip - The clip.
   * @returns The translated label.
   */
  function clipLabel(clip: Clip): string {
    return t(
      'trackLane.aria.clip',
      {
        label: typeof clip.label === 'string' ? clip.label : clip.id,
        startTime: clip.startTime.toFixed(2),
        duration: clip.duration.toFixed(2),
      },
      { defaultValue: 'Clip {{label}} starting at {{startTime}}s for {{duration}}s' },
    )
  }

  /**
   * The clip block's inline geometry (React's `clipStyle`).
   *
   * @param clip - The clip.
   * @param selected - Whether it is the selected clip.
   * @returns The style declarations.
   */
  function clipStyle(clip: Clip, selected: boolean): string {
    const { left, width } = clipToPixels(clip, scale)
    const background = clip.color ?? 'var(--mol-track-lane-clip-bg, rgba(0, 122, 204, 0.45))'
    return [
      'position: absolute',
      `left: ${left}px`,
      `width: ${width}px`,
      'top: 4px',
      'bottom: 4px',
      `background: ${background}`,
      'border-radius: 4px',
      'box-sizing: border-box',
      `outline: ${selected ? '2px solid currentColor' : 'none'}`,
      'outline-offset: 1px',
      'display: flex',
      'align-items: center',
      'padding-left: 6px',
      'padding-right: 12px',
      'overflow: hidden',
      'user-select: none',
      'touch-action: none',
    ].join('; ')
  }

  /**
   * Native pointermove handler used during an active drag.
   *
   * @param event - Native pointer event.
   */
  function onMove(event: PointerEvent): void {
    const current = drag
    if (!current || event.pointerId !== current.pointerId) return
    const dx = event.clientX - current.startX
    if (!current.moved && Math.abs(dx) < DRAG_DISTANCE_THRESHOLD_PX) return
    current.moved = true
    const dt = pixelsToTime(Math.abs(dx), scale) * (dx < 0 ? -1 : 1)
    if (current.mode === 'move') {
      onClipMove?.(current.clipId, clampClipMove(current.originStartTime + dt), lane)
    } else {
      onClipResize?.(
        current.clipId,
        Math.max(MIN_CLIP_DURATION_SECONDS, current.originDuration + dt),
        lane,
      )
    }
  }

  /**
   * Native pointerup / pointercancel handler that closes the drag gesture.
   *
   * @param event - Native pointer event.
   */
  function onUp(event: PointerEvent): void {
    const current = drag
    if (!current || event.pointerId !== current.pointerId) return
    const wasClick = !current.moved
    const finishedClipId = current.clipId
    const finishedMode = current.mode
    drag = null
    if (wasClick && finishedMode === 'move') onClipClick?.(finishedClipId, lane)
  }

  $effect(() => {
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  })

  /**
   * Begin a drag gesture on a clip body or a resize handle.
   *
   * @param event - The pointer event from the clip element.
   * @param clip - The clip being dragged.
   * @param mode - `'move'` for body drags, `'resize'` for handle drags.
   */
  function beginDrag(event: PointerEvent, clip: Clip, mode: DragState['mode']): void {
    if (event.button !== undefined && event.button !== 0) return
    event.stopPropagation()
    drag = {
      clipId: clip.id,
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      originStartTime: clip.startTime,
      originDuration: clip.duration,
      moved: false,
    }
  }
</script>

<div
  role="group"
  aria-label={laneLabel}
  data-mol-id="track-lane"
  data-lane={lane}
  class={cm.cn(cm.flex({ align: 'stretch', gap: 'sm' }), className)}
>
  {#if name !== undefined || lane !== undefined}
    <div
      data-mol-id="track-lane-header"
      class={cm.cn(cm.flex({ align: 'center' }), cm.sp('p', 2), cm.shrink0)}
      style="width: 120px; min-width: 120px"
    >
      <span
        class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
        data-mol-id="track-lane-name"
        >{#if typeof name === 'function'}{@render name()}{:else if name !== undefined && name !== null}{name}{:else}{headerLabel}{/if}</span
      >
    </div>
  {/if}
  <div
    data-mol-id="track-lane-body"
    style="position: relative; height: {rowHeight}px; min-height: {rowHeight}px; width: 100%; overflow: hidden; touch-action: pan-y"
  >
    {#each clips ?? [] as clip (clip.id)}
      <div
        role="button"
        tabindex="0"
        aria-label={clipLabel(clip)}
        aria-pressed={selectedClipId === clip.id ? 'true' : undefined}
        data-mol-id="track-lane-clip"
        data-clip-id={clip.id}
        data-selected={selectedClipId === clip.id ? 'true' : 'false'}
        class={cm.cn(cm.cursorPointer)}
        style={clipStyle(clip, selectedClipId === clip.id)}
        onpointerdown={(event) => beginDrag(event, clip, 'move')}
      >
        {#if clip.label !== undefined}<span
            data-mol-id="track-lane-clip-label"
            class={cm.cn(cm.textSize('xs'))}
            style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; pointer-events: none"
            >{#if typeof clip.label === 'function'}{@render clip.label()}{:else}{clip.label}{/if}</span
          >{/if}
        <div
          role="separator"
          aria-label={resizeLabel}
          data-mol-id="track-lane-clip-handle"
          style="position: absolute; top: 0px; right: 0px; bottom: 0px; width: 8px; cursor: ew-resize; touch-action: none"
          onpointerdown={(event) => beginDrag(event, clip, 'resize')}
        ></div>
      </div>
    {/each}
  </div>
</div>
