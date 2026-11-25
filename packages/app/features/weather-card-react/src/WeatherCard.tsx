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

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box, GlyphIcon, Path, Svg, Text } from '@molecule/app-ui-react/elements'

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
  alertLabel: alertLabelProp,
  updatedLabel: updatedLabelProp,
  unit = '°F',
  eyebrow: eyebrowProp,
  trace,
  feelsLikeLabel: feelsLikeLabelProp,
  highLowLabel: highLowLabelProp,
  className,
}: WeatherCardProps): ReactElement {
  const alertLabel = slot(alertLabelProp)
  const updatedLabel = slot(updatedLabelProp)
  const eyebrow = slot(eyebrowProp)
  const feelsLikeLabel = slot(feelsLikeLabelProp)
  const highLowLabel = slot(highLowLabelProp)
  const cm = getClassMap()
  const sparkline = buildSparkline(trace)
  const alertTone =
    alertLevel === 'watch'
      ? cm.weatherCardAlertWatch
      : alertLevel === 'warning'
        ? cm.weatherCardAlertWarning
        : cm.weatherCardAlertEmergency

  return (
    <Box
      as="div"
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        cm.weatherCardHero,
        className,
      )}
    >
      <Box as="div" className={cm.cn(cm.weatherCardContent)}>
        <Box as="div" className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}>
          <Box as="div">
            {eyebrow ? (
              <Text
                as="p"
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  cm.sp('mb', 1),
                  cm.weatherCardEyebrow,
                )}
              >
                {eyebrow}
              </Text>
            ) : null}
            <Text
              as="h2"
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('semibold'),
                cm.weatherCardLocation,
              )}
            >
              {locationName}
            </Text>
            {region ? (
              <Text
                as="p"
                className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), cm.weatherCardRegion)}
              >
                {region}
              </Text>
            ) : null}
          </Box>
          {alertLevel ? (
            <Box
              as="span"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                cm.fontWeight('bold'),
                cm.weatherCardAlertBadge,
                alertTone,
              )}
            >
              <GlyphIcon name="warning" className={cm.textSize('sm')} aria-hidden="true" />
              {alertLabel ?? alertLevel}
            </Box>
          ) : null}
        </Box>

        <Box as="div" className={cm.cn(cm.flex({ align: 'baseline', gap: 'lg' }), cm.sp('mt', 8))}>
          <Text
            as="span"
            className={cm.cn(cm.weatherCardTemperature)}
            webStyle={{
              fontSize: '4.5rem',
              fontWeight: 200,
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            {Math.round(temperature)}
            {unit}
          </Text>
          <Box
            as="div"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.weatherCardConditionPill,
            )}
          >
            <GlyphIcon
              name={conditionIcon}
              filled
              className={cm.textSize('2xl')}
              aria-hidden="true"
            />
            {condition ? (
              <Text as="span" className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                {condition}
              </Text>
            ) : null}
          </Box>
        </Box>

        <Box
          as="div"
          className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), cm.sp('mt', 4))}
        >
          {feelsLikeLabel ? (
            <Box
              as="span"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.weatherCardFeelsLike)}
            >
              {feelsLikeLabel}
            </Box>
          ) : null}
          {highLowLabel ? (
            <Box
              as="span"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.weatherCardHighLowChip,
              )}
            >
              {highLowLabel}
            </Box>
          ) : null}
          {updatedLabel ? (
            <Box as="span" className={cm.cn(cm.textSize('xs'), cm.weatherCardUpdated)}>
              {updatedLabel}
            </Box>
          ) : null}
        </Box>
      </Box>

      <Box
        as="div"
        className={cm.cn(cm.sp('mt', 10), cm.h(24), cm.w('full'), cm.weatherCardContent)}
      >
        <Svg
          className={cm.cn(cm.w('full'), cm.h('full'))}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <Path d={sparkline.fill} fill="white" opacity={0.25} />
          <Path
            d={sparkline.stroke}
            fill="none"
            stroke="white"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </Svg>
      </Box>

      <Box as="div" className={cm.cn(cm.weatherCardGlowLarge)} aria-hidden="true" />
      <Box as="div" className={cm.cn(cm.weatherCardGlowSmall)} aria-hidden="true" />
    </Box>
  )
}

export default WeatherCard
