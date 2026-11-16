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
  h,
  onBeforeUnmount,
  onMounted,
  type PropType,
  type VNode,
  type VNodeChild,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import {
  clampClipMove,
  clipToPixels,
  DRAG_DISTANCE_THRESHOLD_PX,
  MIN_CLIP_DURATION_SECONDS,
  pixelsToTime,
} from './geometry.js'
import type { Clip, TrackLaneProps } from './types.js'

/** The pointer state of one drag gesture, kept between the window listeners. */
interface DragState {
  /** The clip being moved or resized. */
  clipId: string
  /** `'move'` for body drags, `'resize'` for handle drags. */
  mode: 'move' | 'resize'
  /** The pointer that started the gesture. */
  pointerId: number
  /** The pointer's client X at the press. */
  startX: number
  /** The clip's start time at the press. */
  originStartTime: number
  /** The clip's duration at the press. */
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

    let drag: DragState | null = null

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
      const scale = props.pixelsPerSecond ?? 20
      const dt = pixelsToTime(Math.abs(dx), scale) * (dx < 0 ? -1 : 1)
      if (current.mode === 'move') {
        props.onClipMove?.(current.clipId, clampClipMove(current.originStartTime + dt), props.lane)
      } else {
        props.onClipResize?.(
          current.clipId,
          Math.max(MIN_CLIP_DURATION_SECONDS, current.originDuration + dt),
          props.lane,
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
      if (wasClick && finishedMode === 'move') props.onClipClick?.(finishedClipId, props.lane)
    }

    onMounted(() => {
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    })
    onBeforeUnmount(() => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
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
          h('div', {
            role: 'separator',
            'aria-label': resizeLabel,
            'data-mol-id': 'track-lane-clip-handle',
            style: handleStyle,
            onPointerdown: (event: PointerEvent) => beginDrag(event, clip, 'resize'),
          }),
        )

        return h(
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
            onPointerdown: (event: PointerEvent) => beginDrag(event, clip, 'move'),
          },
          children,
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
