<!--
  TrackLane: the Svelte counterpart of `@molecule/app-feature-track-lane-react`'s
  `TrackLane` — one row of a multi-track timeline with draggable + resizable clip
  blocks on a `pixelsPerSecond` time axis. Same props (React names), same DOM for
  the same input, same callback calls; every visible string comes from
  `useTranslation()` so a locale switch re-renders it.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { createDragHosts, type DragHandlers } from './drag.js'
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

  /** What a drag does to the clip: `'move'` drags its body, `'resize'` its right edge. */
  type DragMode = 'move' | 'resize'

  /** The gesture in progress: the clip being dragged, and where it was when the contact began. */
  interface DragState {
    clipId: string
    mode: DragMode
    /** The clip's start time when the contact began. */
    originStartTime: number
    /** The clip's duration when the contact began. */
    originDuration: number
    /** Whether the pointer has travelled past the drag threshold. */
    moved: boolean
  }

  /** The gesture in progress, or null. */
  let drag: DragState | null = null

  /** The drag hosts of this lane: every clip block and every resize handle. */
  const hosts = createDragHosts()

  /**
   * Ends the contact of a clip block or handle that leaves the lane, as
   * React's drag cleanup does when it unmounts.
   */
  const dragHost: Action<HTMLElement> = (node) => ({ destroy: () => hosts.cancel(node) })

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
   * Binds clip movement or resizing with a fixed origin for the contact.
   *
   * @param clip - The clip being dragged.
   * @param mode - `'move'` for body drags, `'resize'` for handle drags.
   * @returns What the drag host reports about the contact.
   */
  function clipDrag(clip: Clip, mode: DragMode): DragHandlers {
    /** The gesture in progress when it is this clip's and of this mode. */
    const current = (): DragState | undefined =>
      drag?.clipId === clip.id && drag.mode === mode ? drag : undefined
    return {
      onStart() {
        if (drag) return
        drag = {
          clipId: clip.id,
          mode,
          originStartTime: clip.startTime,
          originDuration: clip.duration,
          moved: false,
        }
      },
      onMove(dx) {
        const state = current()
        if (!state || (!state.moved && Math.abs(dx) < DRAG_DISTANCE_THRESHOLD_PX)) return
        state.moved = true
        const dt = pixelsToTime(Math.abs(dx), scale) * (dx < 0 ? -1 : 1)
        if (mode === 'move') {
          onClipMove?.(clip.id, clampClipMove(state.originStartTime + dt), lane)
        } else {
          onClipResize?.(
            clip.id,
            Math.max(MIN_CLIP_DURATION_SECONDS, state.originDuration + dt),
            lane,
          )
        }
      },
      onEnd(dx) {
        const state = current()
        if (!state) return
        drag = null
        if (mode === 'move' && !state.moved && Math.abs(dx) < DRAG_DISTANCE_THRESHOLD_PX) {
          onClipClick?.(clip.id, lane)
        }
      },
      onCancel() {
        if (current()) drag = null
      },
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
        >{#if typeof name === 'function'}{@render name?.()}{:else if name !== undefined && name !== null}{name}{:else}{headerLabel}{/if}</span
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
        use:dragHost
        onpointerdown={(event) => hosts.press(event.currentTarget, event, clipDrag(clip, 'move'))}
      >
        {#if clip.label !== undefined}<span
            data-mol-id="track-lane-clip-label"
            class={cm.cn(cm.textSize('xs'))}
            style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; pointer-events: none"
            >{#if typeof clip.label === 'function'}{@render clip.label?.()}{:else}{clip.label}{/if}</span
          >{/if}
        <div
          role="separator"
          aria-label={resizeLabel}
          data-mol-id="track-lane-clip-handle"
          style="position: absolute; top: 0px; right: 0px; bottom: 0px; width: 8px; cursor: ew-resize; touch-action: none"
          use:dragHost
          onpointerdown={(event) =>
            hosts.press(event.currentTarget, event, clipDrag(clip, 'resize'))}
        ></div>
      </div>
    {/each}
  </div>
</div>
