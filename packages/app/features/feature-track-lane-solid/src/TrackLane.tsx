/**
 * Solid horizontal track-lane primitive: one row of a multi-track timeline with
 * draggable + resizable clip blocks on a `pixelsPerSecond` time axis.
 *
 * Solid counterpart of `@molecule/app-feature-track-lane-react`'s `TrackLane` —
 * the same props (React names), the same DOM for the same input, and the same
 * callback calls.
 *
 * @module
 */

import { type Component, For, type JSX, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { type ElementDrag, getClassMap } from '@molecule/app-ui'
import { webDrag } from '@molecule/app-ui-solid'

import {
  clampClipMove,
  clipToPixels,
  DRAG_DISTANCE_THRESHOLD_PX,
  MIN_CLIP_DURATION_SECONDS,
  pixelsToTime,
} from './geometry.js'
import type { Clip, TrackLaneProps } from './types.js'

/** What a drag does to the clip: `'move'` drags its body, `'resize'` its right edge. */
type DragMode = 'move' | 'resize'

/** The gesture in progress: the clip being dragged, and where it was when the contact began. */
interface DragState {
  /** The clip being moved or resized. */
  clipId: string
  /** `'move'` for body drags, `'resize'` for handle drags. */
  mode: DragMode
  /** The clip's start time when the contact began. */
  originStartTime: number
  /** The clip's duration when the contact began. */
  originDuration: number
  /** Whether the pointer has travelled past the drag threshold. */
  moved: boolean
}

/** A row identity record: created once per clip id and reused while the id is present. */
interface Row {
  id: string
}

/**
 * One row of a multi-track timeline — renders draggable + resizable clip blocks
 * on a `pixelsPerSecond` time axis. Pointer-down on a clip body starts a
 * drag-to-move, pointer-down on the right-edge handle starts a drag-to-resize,
 * and a click without movement fires `onClipClick`. All styling routes through
 * `getClassMap()` and all user-visible text routes through `t()` (via the
 * companion `@molecule/app-locales-feature-track-lane` locale bond).
 *
 * React keys each clip by its `id` value, so a re-passed or re-ordered array
 * keeps the rendered blocks per id. Solid's `For` keys by reference, so the
 * rows are keyed through stable per-id records: the record for an id is created
 * once and reused, while the row's content reads the CURRENT clip for that id
 * reactively.
 *
 * @param props - Component props (see {@link TrackLaneProps}).
 * @returns The rendered track lane.
 */
export const TrackLane: Component<TrackLaneProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  /** The gesture in progress, or null. */
  let drag: DragState | null = null

  /** One stable record per clip id, created on first sight. */
  const records = new Map<string, Row>()
  /**
   * The rows to render, keyed by their stable per-id records.
   *
   * @returns One record per current clip, in display order.
   */
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const rows = (props.clips ?? []).map((clip) => {
      seen.add(clip.id)
      let row = records.get(clip.id)
      if (!row) {
        row = { id: clip.id }
        records.set(clip.id, row)
      }
      return row
    })
    for (const id of [...records.keys()]) if (!seen.has(id)) records.delete(id)
    return rows
  }

  /**
   * The current clip for one row id.
   *
   * @param id - The clip id.
   * @returns The clip, or undefined while it is absent.
   */
  const clipFor = (id: string): Clip | undefined =>
    (props.clips ?? []).find((clip) => clip.id === id)

  /**
   * The horizontal scale in effect.
   *
   * @returns Pixels per second (default 20).
   */
  const scale = (): number => props.pixelsPerSecond ?? 20

  /**
   * The lane row height in effect.
   *
   * @returns The height in pixels (default 44).
   */
  const rowHeight = (): number => props.height ?? 44

  /** The translated lane label (React's `trackLane.aria.lane`). */
  const laneLabel = (): string =>
    t(
      'trackLane.aria.lane',
      { name: typeof props.name === 'string' ? props.name : '' },
      { defaultValue: 'Track lane {{name}}' },
    )
  /** The translated fallback header (React's `trackLane.header`). */
  const headerLabel = (): string => t('trackLane.header', {}, { defaultValue: 'Track' })
  /** The translated resize-handle label (React's `trackLane.aria.resize`). */
  const resizeLabel = (): string => t('trackLane.aria.resize', {}, { defaultValue: 'Resize clip' })

  /**
   * The translated aria label of one clip (its label, or its id).
   *
   * @param clip - The clip.
   * @returns The translated label.
   */
  const clipLabel = (clip: Clip): string =>
    t(
      'trackLane.aria.clip',
      {
        label: typeof clip.label === 'string' ? clip.label : clip.id,
        startTime: clip.startTime.toFixed(2),
        duration: clip.duration.toFixed(2),
      },
      { defaultValue: 'Clip {{label}} starting at {{startTime}}s for {{duration}}s' },
    )

  /**
   * Binds clip movement or resizing with a fixed origin for the contact.
   *
   * @param clip - The clip being dragged.
   * @param mode - `'move'` for body drags, `'resize'` for handle drags.
   * @returns What the drag host reports about the contact.
   */
  function clipDrag(clip: Clip, mode: DragMode): ElementDrag {
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
      onMove({ dx }) {
        const state = current()
        if (!state || (!state.moved && Math.abs(dx) < DRAG_DISTANCE_THRESHOLD_PX)) return
        state.moved = true
        const dt = pixelsToTime(Math.abs(dx), scale()) * (dx < 0 ? -1 : 1)
        if (mode === 'move') {
          props.onClipMove?.(clip.id, clampClipMove(state.originStartTime + dt), props.lane)
        } else {
          props.onClipResize?.(
            clip.id,
            Math.max(MIN_CLIP_DURATION_SECONDS, state.originDuration + dt),
            props.lane,
          )
        }
      },
      onEnd({ dx }) {
        const state = current()
        if (!state) return
        drag = null
        if (mode === 'move' && !state.moved && Math.abs(dx) < DRAG_DISTANCE_THRESHOLD_PX) {
          props.onClipClick?.(clip.id, props.lane)
        }
      },
      onCancel() {
        if (current()) drag = null
      },
    }
  }

  /**
   * The header's name content: React's `name ?? headerLabel`.
   *
   * @returns The node to render inside the name span.
   */
  const nameContent = (): JSX.Element =>
    props.name !== undefined && props.name !== null ? props.name : headerLabel()

  /**
   * The lane body's inline geometry.
   *
   * @returns The style object (React's `laneStyle`).
   */
  const laneStyle = (): JSX.CSSProperties => ({
    position: 'relative',
    height: `${rowHeight()}px`,
    'min-height': `${rowHeight()}px`,
    width: '100%',
    overflow: 'hidden',
    'touch-action': 'pan-y',
  })

  /**
   * The clip block's inline geometry (React's `clipStyle`).
   *
   * @param clip - The clip.
   * @param selected - Whether it is the selected clip.
   * @returns The style object.
   */
  const clipStyle = (clip: Clip, selected: boolean): JSX.CSSProperties => {
    const { left, width } = clipToPixels(clip, scale())
    return {
      position: 'absolute',
      left: `${left}px`,
      width: `${width}px`,
      top: '4px',
      bottom: '4px',
      background: clip.color ?? 'var(--mol-track-lane-clip-bg, rgba(0, 122, 204, 0.45))',
      'border-radius': '4px',
      'box-sizing': 'border-box',
      outline: selected ? '2px solid currentColor' : 'none',
      'outline-offset': '1px',
      display: 'flex',
      'align-items': 'center',
      'padding-left': '6px',
      'padding-right': '12px',
      overflow: 'hidden',
      'user-select': 'none',
      'touch-action': 'none',
    }
  }

  /** The resize handle's inline geometry (React's `handleStyle`). */
  const handleStyle: JSX.CSSProperties = {
    position: 'absolute',
    top: '0px',
    right: '0px',
    bottom: '0px',
    width: '8px',
    cursor: 'ew-resize',
    'touch-action': 'none',
  }

  /** The clip label's inline geometry (React's label style). */
  const labelStyle: JSX.CSSProperties = {
    overflow: 'hidden',
    'text-overflow': 'ellipsis',
    'white-space': 'nowrap',
    'pointer-events': 'none',
  }

  return (
    <div
      role="group"
      aria-label={laneLabel()}
      data-mol-id="track-lane"
      data-lane={props.lane}
      class={cm.cn(cm.flex({ align: 'stretch', gap: 'sm' }), props.className)}
    >
      <Show when={props.name !== undefined || props.lane !== undefined}>
        <div
          data-mol-id="track-lane-header"
          class={cm.cn(cm.flex({ align: 'center' }), cm.sp('p', 2), cm.shrink0)}
          style={{ width: '120px', 'min-width': '120px' }}
        >
          <span
            class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
            data-mol-id="track-lane-name"
          >
            {nameContent()}
          </span>
        </div>
      </Show>
      <div data-mol-id="track-lane-body" style={laneStyle()}>
        <For each={keyedRows()}>
          {(row) => (
            <Show when={clipFor(row.id)}>
              {(clip) => (
                <div
                  ref={(host) => webDrag(host, () => clipDrag(clip(), 'move'))}
                  role="button"
                  tabIndex={0}
                  aria-label={clipLabel(clip())}
                  aria-pressed={props.selectedClipId === clip().id ? 'true' : undefined}
                  data-mol-id="track-lane-clip"
                  data-clip-id={clip().id}
                  data-selected={props.selectedClipId === clip().id ? 'true' : 'false'}
                  class={cm.cn(cm.cursorPointer)}
                  style={clipStyle(clip(), props.selectedClipId === clip().id)}
                >
                  {clip().label !== undefined ? (
                    <span
                      data-mol-id="track-lane-clip-label"
                      class={cm.cn(cm.textSize('xs'))}
                      style={labelStyle}
                    >
                      {clip().label}
                    </span>
                  ) : null}
                  <div
                    ref={(host) => webDrag(host, () => clipDrag(clip(), 'resize'))}
                    role="separator"
                    aria-label={resizeLabel()}
                    data-mol-id="track-lane-clip-handle"
                    style={handleStyle}
                  />
                </div>
              )}
            </Show>
          )}
        </For>
      </div>
    </div>
  )
}
