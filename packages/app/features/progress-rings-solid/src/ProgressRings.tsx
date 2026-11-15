/**
 * Solid Apple-Health-style concentric SVG progress rings — single + triad.
 *
 * Solid counterpart of `@molecule/app-progress-rings-react`'s `ProgressRings` —
 * the same props (React names), the same ClassMap classes and the same DOM for
 * the same input.
 *
 * @module
 */

import { type Component, Index, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { ProgressRing, ProgressRingsProps } from './types.js'

/** Internal: one ring's geometry (radius + arc lengths). */
interface RingGeometry {
  radius: number
  circumference: number
  filledLength: number
}

/**
 * Compute geometry for a single ring at index `i`.
 *
 * Rings are nested inside-out — index 0 is the outermost. Each successive
 * ring sits one (strokeWidth + gap) inward.
 *
 * @param i - Ring index (0 = outermost).
 * @param size - Outer SVG diameter.
 * @param strokeWidth - Stroke thickness.
 * @param gap - Gap between rings.
 * @param ring - The ring data.
 * @returns Computed radius / circumference / filled-length for the ring.
 */
function computeGeometry(
  i: number,
  size: number,
  strokeWidth: number,
  gap: number,
  ring: ProgressRing,
): RingGeometry {
  const radius = size / 2 - strokeWidth / 2 - i * (strokeWidth + gap)
  const circumference = 2 * Math.PI * Math.max(radius, 0)
  const safeMax = ring.max > 0 ? ring.max : 1
  const ratio = Math.max(0, Math.min(1, ring.value / safeMax))
  const filledLength = circumference * ratio
  return { radius, circumference, filledLength }
}

/**
 * Apple-Health-style concentric SVG progress rings. Renders a single circular
 * ring when `rings.length === 1`, or a nested stack of rings (outermost first)
 * for 2+ entries. Pure SVG — no canvas, no chart-library dep. Layout resolves
 * via the wired ClassMap; ring colors come from props (typically resolved from
 * theme tokens by the caller). The stack is index-keyed (`Index`), matching
 * React's per-ring keys, so equal new data keeps the rendered nodes.
 *
 * @param props - Component props (see {@link ProgressRingsProps}).
 * @returns The rendered progress rings.
 */
export const ProgressRings: Component<ProgressRingsProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const size = (): number => props.size ?? 160
  const strokeWidth = (): number => props.strokeWidth ?? 12
  const gap = (): number => props.gap ?? 4
  const cornerRadius = (): 'round' | 'butt' => props.cornerRadius ?? 'round'
  const center = (): number => size() / 2
  const summary = (): string =>
    props.ariaLabel ??
    t(
      'progressRings.summary',
      { count: props.rings.length },
      {
        defaultValue: 'Progress rings ({{count}} rings)',
      },
    )
  const geometry = (i: number, ring: ProgressRing): RingGeometry =>
    computeGeometry(i, size(), strokeWidth(), gap(), ring)
  const ringLabel = (i: number, label: string | undefined): string =>
    label ?? t('progressRings.ring', { index: i + 1 }, { defaultValue: 'Ring {{index}}' })

  return (
    <svg
      class={cm.cn(props.className)}
      data-mol-id={props.dataMolId ?? 'progress-rings'}
      role="img"
      aria-label={summary()}
      width={size()}
      height={size()}
      viewBox={`0 0 ${size()} ${size()}`}
    >
      <Index each={props.rings}>
        {(ring, i) => (
          <Show when={geometry(i, ring()).radius > 0}>
            <g role="img" aria-label={ringLabel(i, ring().label)}>
              <circle
                cx={center()}
                cy={center()}
                r={geometry(i, ring()).radius}
                fill="none"
                stroke={ring().color}
                stroke-opacity={0.18}
                stroke-width={strokeWidth()}
              />
              <circle
                cx={center()}
                cy={center()}
                r={geometry(i, ring()).radius}
                fill="none"
                stroke={ring().color}
                stroke-width={strokeWidth()}
                stroke-linecap={cornerRadius()}
                stroke-dasharray={`${geometry(i, ring()).filledLength} ${
                  geometry(i, ring()).circumference
                }`}
                transform={`rotate(-90 ${center()} ${center()})`}
              />
            </g>
          </Show>
        )}
      </Index>
    </svg>
  )
}
