/**
 * Vue horizontal track-lane primitive: one row of a multi-track timeline with
 * draggable + resizable clip blocks on a `pixelsPerSecond` time axis.
 *
 * Vue counterpart of `@molecule/app-feature-track-lane-react`'s `TrackLane` —
 * the same props (React names), the same DOM for the same input, and the same
 * callback calls.
 *
 * @module
 */

import {
  defineComponent,
  type Directive,
  h,
  type PropType,
  type VNode,
  type VNodeChild,
  withDirectives,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { createDragHosts, type DragHandlers } from './drag.js'
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

/**
 * One row of a multi-track timeline — renders draggable + resizable clip blocks
 * on a `pixelsPerSecond` time axis. Pointer-down on a clip body starts a
 * drag-to-move, pointer-down on the right-edge handle starts a drag-to-resize,
 * and a click without movement fires `onClipClick`. All styling routes through
 * `getClassMap()` and all user-visible text routes through `t()` (via the
 * companion `@molecule/app-locales-feature-track-lane` locale bond).
 *
 * @param props - Component props (see {@link TrackLaneProps}).
 * @returns The track lane component.
 */
export const TrackLane = defineComponent({
  name: 'TrackLane',
  props: {
    /** Optional lane name; a node prop that also accepts a same-named slot. */
    name: null,
    /** Clips on this lane, in display order. */
    clips: { type: Array as PropType<Clip[]>, required: true },
    /** Horizontal time scale, defaults to 20 (read at render time). */
    pixelsPerSecond: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    /** Opaque lane identifier, forwarded to handlers and emitted as `data-lane`. */
    lane: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    /** Lane row height in pixels, defaults to 44 (read at render time). */
    height: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    /** Called when a clip is dragged horizontally. */
    onClipMove: {
      type: Function as PropType<TrackLaneProps['onClipMove']>,
      default: undefined,
    },
    /** Called when a clip's right edge handle is dragged. */
    onClipResize: {
      type: Function as PropType<TrackLaneProps['onClipResize']>,
      default: undefined,
    },
    /** Called when a clip body is clicked (no drag). */
    onClipClick: {
      type: Function as PropType<TrackLaneProps['onClipClick']>,
      default: undefined,
    },
    /** Currently-selected clip id (renders the selection ring on that clip). */
    selectedClipId: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    /** Extra classes merged onto the root element. */
    className: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /** The gesture in progress, or null. */
    let drag: DragState | null = null

    /** The drag hosts of this lane: every clip block and every resize handle. */
    const hosts = createDragHosts()

    /**
     * Ends the contact of a clip block or handle that leaves the lane, as
     * React's drag cleanup does when it unmounts.
     */
    const vDragHost: Directive<HTMLElement> = {
      unmounted: (element) => hosts.cancel(element),
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
          const dt = pixelsToTime(Math.abs(dx), props.pixelsPerSecond ?? 20) * (dx < 0 ? -1 : 1)
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
        onEnd(dx) {
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
     * The header's name content: the same-named slot first, then the prop, then
     * React's translated `'Track'` fallback.
     *
     * @returns The children React renders inside the name span.
     */
    function nameContent(): VNodeChild[] {
      if (slots.name) return slots.name()
      if (props.name !== undefined && props.name !== null) return [props.name]
      return [t('trackLane.header', {}, { defaultValue: 'Track' })]
    }

    return (): VNode => {
      const scale = props.pixelsPerSecond ?? 20
      const rowHeight = props.height ?? 44
      const laneLabel = t(
        'trackLane.aria.lane',
        { name: typeof props.name === 'string' ? props.name : '' },
        { defaultValue: 'Track lane {{name}}' },
      )
      const resizeLabel = t('trackLane.aria.resize', {}, { defaultValue: 'Resize clip' })

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

      const laneStyle = {
        position: 'relative',
        height: `${rowHeight}px`,
        minHeight: `${rowHeight}px`,
        width: '100%',
        overflow: 'hidden',
        touchAction: 'pan-y',
      }

      const clips: VNodeChild[] = (props.clips ?? []).map((clip) => {
        const { left, width } = clipToPixels(clip, scale)
        const isSelected = props.selectedClipId === clip.id
        const clipStyle = {
          position: 'absolute',
          left: `${left}px`,
          width: `${width}px`,
          top: '4px',
          bottom: '4px',
          background: clip.color ?? 'var(--mol-track-lane-clip-bg, rgba(0, 122, 204, 0.45))',
          borderRadius: '4px',
          boxSizing: 'border-box',
          outline: isSelected ? '2px solid currentColor' : 'none',
          outlineOffset: '1px',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '6px',
          paddingRight: '12px',
          overflow: 'hidden',
          userSelect: 'none',
          touchAction: 'none',
        }
        const handleStyle = {
          position: 'absolute',
          top: '0px',
          right: '0px',
          bottom: '0px',
          width: '8px',
          cursor: 'ew-resize',
          touchAction: 'none',
        }

        const children: VNodeChild[] = []
        if (clip.label !== undefined) {
          children.push(
            h(
              'span',
              {
                'data-mol-id': 'track-lane-clip-label',
                class: cm.cn(cm.textSize('xs')),
                style: {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                },
              },
              [clip.label],
            ),
          )
        }
        children.push(
          withDirectives(
            h('div', {
              role: 'separator',
              'aria-label': resizeLabel,
              'data-mol-id': 'track-lane-clip-handle',
              style: handleStyle,
              onPointerdown: (event: PointerEvent) =>
                hosts.press(event.currentTarget as HTMLElement, event, clipDrag(clip, 'resize')),
            }),
            [[vDragHost]],
          ),
        )

        return withDirectives(
          h(
            'div',
            {
              key: clip.id,
              role: 'button',
              tabIndex: 0,
              'aria-label': clipLabel(clip),
              'aria-pressed': isSelected ? 'true' : undefined,
              'data-mol-id': 'track-lane-clip',
              'data-clip-id': clip.id,
              'data-selected': isSelected ? 'true' : 'false',
              class: cm.cn(cm.cursorPointer),
              style: clipStyle,
              onPointerdown: (event: PointerEvent) =>
                hosts.press(event.currentTarget as HTMLElement, event, clipDrag(clip, 'move')),
            },
            children,
          ),
          [[vDragHost]],
        )
      })

      const root: VNodeChild[] = []
      // React's condition is on the props (`name !== undefined || lane !==
      // undefined`); a name passed only as the same-named slot is this
      // framework's spelling of the same input, so it opens the header too.
      if (props.name !== undefined || props.lane !== undefined || slots.name) {
        root.push(
          h(
            'div',
            {
              'data-mol-id': 'track-lane-header',
              class: cm.cn(cm.flex({ align: 'center' }), cm.sp('p', 2), cm.shrink0),
              style: { width: '120px', minWidth: '120px' },
            },
            [
              h(
                'span',
                {
                  class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')),
                  'data-mol-id': 'track-lane-name',
                },
                nameContent(),
              ),
            ],
          ),
        )
      }
      root.push(h('div', { 'data-mol-id': 'track-lane-body', style: laneStyle }, clips))

      return h(
        'div',
        {
          role: 'group',
          'aria-label': laneLabel,
          'data-mol-id': 'track-lane',
          'data-lane': props.lane,
          class: cm.cn(cm.flex({ align: 'stretch', gap: 'sm' }), props.className),
        },
        root,
      )
    }
  },
})
