/**
 * Current-conditions hero card. Pure presentation — the consumer feeds
 * a location + temperature + optional trace; the component renders the
 * gradient hero, glass condition pill, alert badge, hi/lo chip, and
 * 24h temperature sparkline.
 *
 * Stateless about units and i18n: pass pre-formatted strings if you
 * need anything beyond the default integer-rounded temperature.
 *
 * @module
 */

import type { ReactElement, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/** Severity level for a weather alert badge. */
export type WeatherAlertLevel = 'watch' | 'warning' | 'emergency'

/** A single hour's temperature measurement in the 24h sparkline trace. */
export interface WeatherTracePoint {
  hour: string
  temperature: number
}

/** Props for the {@link WeatherCard} component. */
export interface WeatherCardProps {
  locationName: string
  region?: string | null
  temperature: number
  /** Currently INERT — nothing renders it; pass `feelsLikeLabel` instead. */
  feelsLike?: number | null
  /** Currently INERT — nothing renders it; pass `highLowLabel` instead. */
  high?: number | null
  /** Currently INERT — nothing renders it; pass `highLowLabel` instead. */
  low?: number | null
  condition?: string | null
  /** material-symbols icon name. */
  conditionIcon?: string
  alertLevel?: WeatherAlertLevel | null
  alertLabel?: ReactNode
  /** Pre-formatted relative time string (e.g. "5m ago"). */
  updatedLabel?: ReactNode
  unit?: string
  /** "Right now" eyebrow text — defaults to empty. */
  eyebrow?: ReactNode
  /** 24h trace driving the area sparkline. */
  trace?: ReadonlyArray<WeatherTracePoint>
  /** Pre-formatted "Feels like {N}°" label. */
  feelsLikeLabel?: ReactNode
  /** Pre-formatted high/low chip label. */
  highLowLabel?: ReactNode
  className?: string
}

const ALERT_TONE: Record<WeatherAlertLevel, string> = {
  watch: 'bg-warning/30 text-white',
  warning: 'bg-error/30 text-white',
  emergency: 'bg-error/60 text-white',
}

/** Computes SVG fill and stroke path data for the 24h temperature sparkline. */
function buildSparkline(trace: ReadonlyArray<WeatherTracePoint> | undefined): {
  fill: string
  stroke: string
} {
  const fallback = {
    fill: 'M0,68 Q40,52 80,46 T160,38 T240,55 T320,28 T400,42 L400,100 L0,100 Z',
    stroke: 'M0,68 Q40,52 80,46 T160,38 T240,55 T320,28 T400,42',
  }
  if (!trace || trace.length < 2) return fallback
  const W = 400
  const H = 100
  const values = trace.map((p) => p.temperature)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((v - min) / range) * (H * 0.85) - H * 0.1
    return [x, y] as const
  })
  const stroke = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const fill = `${stroke} L${W},${H} L0,${H} Z`
  return { fill, stroke }
}

/** Atmospheric current-conditions hero. */
export function WeatherCard({
  locationName,
  region,
  temperature,
  condition,
  conditionIcon = 'partly_cloudy_day',
  alertLevel,
  alertLabel,
  updatedLabel,
  unit = '°F',
  eyebrow,
  trace,
  feelsLikeLabel,
  highLowLabel,
  className,
}: WeatherCardProps): ReactElement {
  const cm = getClassMap()
  const sparkline = buildSparkline(trace)

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[360px] bg-gradient-to-br from-primary via-primary-container to-tertiary-container rounded-[2rem] text-white relative overflow-hidden shadow-2xl shadow-primary/30',
        className,
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}>
          <div>
            {eyebrow ? (
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  cm.sp('mb', 1),
                  'uppercase tracking-widest text-primary-fixed/80',
                )}
              >
                {eyebrow}
              </p>
            ) : null}
            <h2
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('semibold'),
                'tracking-tight text-white',
              )}
            >
              {locationName}
            </h2>
            {region ? (
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mt', 1),
                  'font-mono uppercase tracking-widest text-white/70',
                )}
              >
                {region}
              </p>
            ) : null}
          </div>
          {alertLevel ? (
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest backdrop-blur-md',
                ALERT_TONE[alertLevel],
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}
                aria-hidden="true"
              >
                warning
              </span>
              {alertLabel ?? alertLevel}
            </span>
          ) : null}
        </div>

        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'lg' }), cm.sp('mt', 8))}>
          <span
            className={cm.cn('tabular-nums text-white')}
            style={{
              fontSize: '4.5rem',
              fontWeight: 200,
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            {Math.round(temperature)}
            {unit}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              'bg-white/20 backdrop-blur-md border border-white/15',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined', cm.textSize('2xl'))}
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              {conditionIcon}
            </span>
            {condition ? (
              <span className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                {condition}
              </span>
            ) : null}
          </div>
        </div>

        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), cm.sp('mt', 4))}
        >
          {feelsLikeLabel ? (
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-white/85')}>
              {feelsLikeLabel}
            </span>
          ) : null}
          {highLowLabel ? (
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'bg-white/15 backdrop-blur-md tabular-nums',
              )}
            >
              {highLowLabel}
            </span>
          ) : null}
          {updatedLabel ? (
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-mono uppercase tracking-widest text-white/60',
              )}
            >
              {updatedLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className={cm.cn(cm.sp('mt', 10), cm.h(24), cm.w('full'), 'relative z-10')}>
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'))}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={sparkline.fill} fill="white" opacity="0.25" />
          <path
            d={sparkline.stroke}
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div
        className={cm.cn(
          'absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-white/10 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute right-12 top-12 w-20 h-20 rounded-full bg-tertiary-fixed/30 blur-2xl',
        )}
        aria-hidden="true"
      />
    </div>
  )
}

export default WeatherCard
