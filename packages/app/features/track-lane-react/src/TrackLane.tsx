import type { JSX, ReactNode } from 'react'
import { useRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { type CSSProperties, type ElementDrag, getClassMap } from '@molecule/app-ui'
import { Box, Pressable } from '@molecule/app-ui-react/elements'

/**
 * A single clip block on a track lane. `startTime` and `duration` are
 * both in seconds; `pixelsPerSecond` on the lane converts them to the
 * on-screen geometry. `id` is a stable identifier used as the React
 * key and as the argument passed back to all event handlers. `color`
 * accents the body fill (defaults to a neutral surface) and `label`
 * is rendered inside the clip when given.
 */
export interface Clip {
  /** Stable identifier for the clip (used as a React key + handler arg). */
  id: string
  /** Clip start time on the lane in seconds. */
  startTime: number
  /** Clip duration in seconds. Always positive — minimum is enforced. */
  duration: number
  /** Optional accent color for the clip body (any valid CSS color). */
  color?: string
  /** Optional inline label rendered on top of the clip body. */
  label?: ReactNode
}

/** Props for `<TrackLane>`. */
export interface TrackLaneProps {
  /** Optional lane name shown in the leading lane header. */
  name?: ReactNode
  /** Clips on this lane. Order is preserved as-is. */
  clips: Clip[]
  /** Horizontal time scale, defaults to 20. */
  pixelsPerSecond?: number
  /**
   * Optional opaque lane identifier. Forwarded to handlers and emitted
   * as `data-lane` so multi-lane parents can tell lanes apart.
   */
  lane?: string
  /** Lane row height in pixels. Defaults to 44. */
  height?: number
  /** Called when a clip is dragged horizontally. */
  onClipMove?: (clipId: string, startTime: number, lane?: string) => void
  /** Called when a clip's right edge handle is dragged. */
  onClipResize?: (clipId: string, duration: number, lane?: string) => void
  /** Called when a clip body is clicked (no drag). */
  onClipClick?: (clipId: string, lane?: string) => void
  /** Currently-selected clip id (renders the selection ring on that clip). */
  selectedClipId?: string
  /** Extra classes merged onto the root element. */
  className?: string
}

/** Minimum clip duration in seconds — clips can't be resized below this. */
export const MIN_CLIP_DURATION_SECONDS = 0.05

/** Pointer-distance threshold (px) before a press becomes a drag. */
export const DRAG_DISTANCE_THRESHOLD_PX = 3

/**
 * Convert a `Clip` to its on-lane pixel geometry.
 *
 * @param clip - The clip to project.
 * @param pixelsPerSecond - Horizontal scale.
 * @returns `{ left, width }` in pixels.
 */
export function clipToPixels(
  clip: Pick<Clip, 'startTime' | 'duration'>,
  pixelsPerSecond: number,
): { left: number; width: number } {
  const safeScale = pixelsPerSecond > 0 ? pixelsPerSecond : 1
  return {
    left: clip.startTime * safeScale,
    width: Math.max(1, clip.duration * safeScale),
  }
}

/**
 * Convert a pixel offset back to a time value, clamped to `>= 0`.
 *
 * @param pixels - Offset in pixels.
 * @param pixelsPerSecond - Horizontal scale.
 * @returns Time in seconds (never negative).
 */
export function pixelsToTime(pixels: number, pixelsPerSecond: number): number {
  const safeScale = pixelsPerSecond > 0 ? pixelsPerSecond : 1
  const t = pixels / safeScale
  return t < 0 ? 0 : t
}

/**
 * Clamp the proposed new `startTime` for a clip move so the clip stays
 * non-negative. (No upper bound — the parent decides whether to clip
 * to a song length.)
 *
 * @param proposedStartTime - The candidate start time in seconds.
 * @returns The clamped start time.
 */
export function clampClipMove(proposedStartTime: number): number {
  return proposedStartTime < 0 ? 0 : proposedStartTime
}

interface DragState {
  clipId: string
  mode: 'move' | 'resize'
  originStartTime: number
  originDuration: number
  moved: boolean
}

/**
 * One row of a multi-track timeline — renders draggable + resizable
 * clip blocks on a `pixelsPerSecond` time axis. Pointer-down on a clip
 * body starts a drag-to-move, pointer-down on the right-edge handle
 * starts a drag-to-resize, and a click without movement fires
 * `onClipClick`. All styling routes through `getClassMap()` and all
 * user-visible text routes through `t()` (via the companion
 * `@molecule/app-locales-feature-track-lane` locale bond).
 *
 * @param props - Component props.
 * @returns The track-lane element.
 */
export function TrackLane(props: TrackLaneProps): JSX.Element {
  const {
    name,
    clips,
    pixelsPerSecond = 20,
    lane,
    height = 44,
    onClipMove,
    onClipResize,
    onClipClick,
    selectedClipId,
    className,
  } = props

  const cm = getClassMap()
  const { t } = useTranslation()

  const dragRef = useRef<DragState | null>(null)

  const laneLabel = t(
    'trackLane.aria.lane',
    { name: typeof name === 'string' ? name : '' },
    { defaultValue: 'Track lane {{name}}' },
  )
  const headerLabel = t('trackLane.header', {}, { defaultValue: 'Track' })
  const resizeLabel = t('trackLane.aria.resize', {}, { defaultValue: 'Resize clip' })
  const clipAriaLabel = (clip: Clip): string =>
    t(
      'trackLane.aria.clip',
      {
        label: typeof clip.label === 'string' ? clip.label : clip.id,
        startTime: clip.startTime.toFixed(2),
        duration: clip.duration.toFixed(2),
      },
      { defaultValue: 'Clip {{label}} starting at {{startTime}}s for {{duration}}s' },
    )

  /** Binds clip movement or resizing with a fixed origin for the contact. */
  function clipDrag(clip: Clip, mode: DragState['mode']): ElementDrag {
    const current = (): DragState | undefined => {
      const drag = dragRef.current
      return drag?.clipId === clip.id && drag.mode === mode ? drag : undefined
    }
    return {
      onStart() {
        if (dragRef.current) return
        dragRef.current = {
          clipId: clip.id,
          mode,
          originStartTime: clip.startTime,
          originDuration: clip.duration,
          moved: false,
        }
      },
      onMove({ dx }) {
        const drag = current()
        if (!drag || (!drag.moved && Math.abs(dx) < DRAG_DISTANCE_THRESHOLD_PX)) return
        drag.moved = true
        const dt = pixelsToTime(Math.abs(dx), pixelsPerSecond) * (dx < 0 ? -1 : 1)
        if (mode === 'move') onClipMove?.(clip.id, clampClipMove(drag.originStartTime + dt), lane)
        else
          onClipResize?.(
            clip.id,
            Math.max(MIN_CLIP_DURATION_SECONDS, drag.originDuration + dt),
            lane,
          )
      },
      onEnd({ dx }) {
        const drag = current()
        if (!drag) return
        dragRef.current = null
        if (mode === 'move' && !drag.moved && Math.abs(dx) < DRAG_DISTANCE_THRESHOLD_PX) {
          onClipClick?.(clip.id, lane)
        }
      },
      onCancel() {
        if (current()) dragRef.current = null
      },
    }
  }

  const laneStyle: CSSProperties = {
    position: 'relative',
    height,
    minHeight: height,
    width: '100%',
    overflow: 'hidden',
    touchAction: 'pan-y',
  }

  return (
    <Box
      as="div"
      role="group"
      aria-label={laneLabel}
      data-mol-id="track-lane"
      data-lane={lane}
      className={cm.cn(cm.flex({ align: 'stretch', gap: 'sm' }), className)}
    >
      {(name !== undefined || lane !== undefined) && (
        <Box
          as="div"
          data-mol-id="track-lane-header"
          className={cm.cn(cm.flex({ align: 'center' }), cm.sp('p', 2), cm.shrink0)}
          webStyle={{ width: 120, minWidth: 120 }}
        >
          <Box
            as="span"
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
            data-mol-id="track-lane-name"
          >
            {name ?? headerLabel}
          </Box>
        </Box>
      )}
      <Box as="div" data-mol-id="track-lane-body" webStyle={laneStyle}>
        {clips.map((clip) => {
          const { left, width } = clipToPixels(clip, pixelsPerSecond)
          const isSelected = selectedClipId === clip.id
          const clipStyle: CSSProperties = {
            position: 'absolute',
            left,
            width,
            top: 4,
            bottom: 4,
            background: clip.color ?? 'var(--mol-track-lane-clip-bg, rgba(0, 122, 204, 0.45))',
            borderRadius: 4,
            boxSizing: 'border-box',
            outline: isSelected ? '2px solid currentColor' : 'none',
            outlineOffset: 1,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 6,
            paddingRight: 12,
            overflow: 'hidden',
            userSelect: 'none',
            touchAction: 'none',
          }
          const handleStyle: CSSProperties = {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 8,
            cursor: 'ew-resize',
            touchAction: 'none',
          }
          return (
            <Pressable
              as="div"
              key={clip.id}
              role="button"
              tabIndex={0}
              aria-label={clipAriaLabel(clip)}
              aria-pressed={isSelected ? 'true' : undefined}
              data-mol-id="track-lane-clip"
              data-clip-id={clip.id}
              data-selected={isSelected ? 'true' : 'false'}
              className={cm.cn(cm.cursorPointer)}
              webStyle={clipStyle}
              drag={clipDrag(clip, 'move')}
            >
              {clip.label !== undefined && (
                <Box
                  as="span"
                  data-mol-id="track-lane-clip-label"
                  className={cm.cn(cm.textSize('xs'))}
                  webStyle={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                  }}
                >
                  {clip.label}
                </Box>
              )}
              <Box
                as="div"
                role="separator"
                aria-label={resizeLabel}
                data-mol-id="track-lane-clip-handle"
                webStyle={handleStyle}
                drag={clipDrag(clip, 'resize')}
              />
            </Pressable>
          )
        })}
      </Box>
    </Box>
  )
}
