import type { JSX } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/** Single ring entry — value/max plus the colored accent and an optional label. */
export interface ProgressRing {
  /** Current progress value. Clamped against `max` at render time. */
  value: number
  /** Maximum / goal value. Must be > 0; values <= 0 fall back to 1. */
  max: number
  /**
   * SVG stroke color for this ring. Pass a CSS color (token-resolved by the
   * caller against the active theme) — the component never hardcodes color.
   */
  color: string
  /** Optional accessible label for this ring (e.g. "Steps", "Sleep"). */
  label?: string
}

/** Props for `<ProgressRings>` — the unified single + concentric-triad component. */
export interface ProgressRingsProps {
  /** One or more rings. 1 ring = single circle; 2+ = concentric Apple-Health-style stack. */
  rings: ProgressRing[]
  /** Outer SVG diameter in px. Defaults to 160. */
  size?: number
  /** Stroke thickness for each ring in px. Defaults to 12. */
  strokeWidth?: number
  /** Gap between concentric rings in px (ignored when only one ring). Defaults to 4. */
  gap?: number
  /**
   * Stroke linecap rounding. `'round'` produces the iOS-Health pill caps;
   * `'butt'` is flat. Defaults to `'round'`.
   */
  cornerRadius?: 'round' | 'butt'
  /** Override the outer wrapper classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Optional aria-label for the whole graphic. Falls back to translated summary. */
  ariaLabel?: string
}

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
 * @param i — Ring index (0 = outermost).
 * @param size — Outer SVG diameter.
 * @param strokeWidth — Stroke thickness.
 * @param gap — Gap between rings.
 * @param ring — The ring data.
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
 * for 2+ entries. Pure SVG — no canvas, no chart-library dep. Layout and
 * typography resolve via the wired ClassMap; ring colors come from props
 * (typically resolved from theme tokens by the caller).
 *
 * @param props - Component props (see {@link ProgressRingsProps}).
 */
export function ProgressRings({
  rings,
  size = 160,
  strokeWidth = 12,
  gap = 4,
  cornerRadius = 'round',
  className,
  dataMolId,
  ariaLabel,
}: ProgressRingsProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()

  const center = size / 2
  const summary =
    ariaLabel ??
    t(
      'progressRings.summary',
      { count: rings.length },
      {
        defaultValue: rings.length === 1 ? 'Progress ring' : `Progress rings ({{count}} rings)`,
      },
    )

  return (
    <svg
      className={cm.cn(className)}
      data-mol-id={dataMolId ?? 'progress-rings'}
      role="img"
      aria-label={summary}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      {rings.map((ring, i) => {
        const { radius, circumference, filledLength } = computeGeometry(
          i,
          size,
          strokeWidth,
          gap,
          ring,
        )
        if (radius <= 0) return null
        const perRingLabel =
          ring.label ??
          t('progressRings.ring', { index: i + 1 }, { defaultValue: 'Ring {{index}}' })
        return (
          <g key={i} role="img" aria-label={perRingLabel}>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={ring.color}
              strokeOpacity={0.18}
              strokeWidth={strokeWidth}
            />
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={ring.color}
              strokeWidth={strokeWidth}
              strokeLinecap={cornerRadius}
              strokeDasharray={`${filledLength} ${circumference}`}
              transform={`rotate(-90 ${center} ${center})`}
            />
          </g>
        )
      })}
    </svg>
  )
}
