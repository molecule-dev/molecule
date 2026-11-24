/**
 * Solid current-conditions hero card: gradient background, glass condition
 * pill, optional alert badge, hi/lo chip, and a 24h temperature sparkline
 * rendered from a trace.
 *
 * Solid counterpart of `@molecule/app-weather-card-react`'s `WeatherCard` —
 * the same props (React names), the same ClassMap tokens and the same DOM for
 * the same input.
 *
 * @module
 */

import { type Component, Show } from 'solid-js'

import { PresentWhileNode, ResolveNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { WeatherCardProps, WeatherTracePoint } from './types.js'

/** The sparkline's fixed DECORATIVE path, used when the trace is absent or too short. */
const FALLBACK = {
  fill: 'M0,68 Q40,52 80,46 T160,38 T240,55 T320,28 T400,42 L400,100 L0,100 Z',
  stroke: 'M0,68 Q40,52 80,46 T160,38 T240,55 T320,28 T400,42',
}

/**
 * Computes SVG fill and stroke path data for the 24h temperature sparkline.
 *
 * @param trace - The trace, when the caller supplied one.
 * @returns The area `fill` path and the line `stroke` path.
 */
function buildSparkline(trace: ReadonlyArray<WeatherTracePoint> | undefined): {
  fill: string
  stroke: string
} {
  if (!trace || trace.length < 2) return FALLBACK
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

/**
 * Atmospheric current-conditions hero.
 *
 * Layout: `[eyebrow? locationName region? alert?] [temperature condition?]
 * [feelsLike? highLow? updated?] [24h sparkline]`. All visual styling routes
 * through ClassMap tokens so the bonded styling layer controls the visual
 * treatment; the temperature's type scale and the glyph fill are inline,
 * exactly as React writes them.
 *
 * @param props - Component props (see {@link WeatherCardProps}).
 * @returns The rendered weather card.
 */
export const WeatherCard: Component<WeatherCardProps> = (props) => {
  const cm = getClassMap()
  const conditionIcon = (): string | undefined => props.conditionIcon ?? 'partly_cloudy_day'
  const unit = (): string => props.unit ?? '°F'
  const sparkline = (): { fill: string; stroke: string } => buildSparkline(props.trace)
  const alertTone = (): string =>
    props.alertLevel === 'watch'
      ? cm.weatherCardAlertWatch
      : props.alertLevel === 'warning'
        ? cm.weatherCardAlertWarning
        : cm.weatherCardAlertEmergency

  return (
    <div
      class={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        cm.weatherCardHero,
        props.className,
      )}
    >
      <div class={cm.cn(cm.weatherCardContent)}>
        <div class={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }))}>
          <div>
            <PresentWhileNode node={props.eyebrow}>
              {(eyebrow) => (
                <p
                  class={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    cm.sp('mb', 1),
                    cm.weatherCardEyebrow,
                  )}
                >
                  {eyebrow()}
                </p>
              )}
            </PresentWhileNode>
            <h2
              class={cm.cn(cm.textSize('2xl'), cm.fontWeight('semibold'), cm.weatherCardLocation)}
            >
              {props.locationName}
            </h2>
            {props.region ? (
              <p class={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), cm.weatherCardRegion)}>
                {props.region}
              </p>
            ) : null}
          </div>
          {props.alertLevel ? (
            <span
              class={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                cm.fontWeight('bold'),
                cm.weatherCardAlertBadge,
                alertTone(),
              )}
            >
              <span class={cm.cn(cm.iconGlyphFont, cm.textSize('sm'))} aria-hidden="true">
                warning
              </span>
              <ResolveNode node={props.alertLabel}>
                {(alertLabel, hasAlertLabel) => (
                  <Show when={hasAlertLabel()} fallback={props.alertLevel}>
                    {alertLabel()}
                  </Show>
                )}
              </ResolveNode>
            </span>
          ) : null}
        </div>

        <div class={cm.cn(cm.flex({ align: 'baseline', gap: 'lg' }), cm.sp('mt', 8))}>
          <span
            class={cm.cn(cm.weatherCardTemperature)}
            style={{
              'font-size': '4.5rem',
              'font-weight': '200',
              'letter-spacing': '-0.03em',
              'line-height': '1',
            }}
          >
            {Math.round(props.temperature)}
            {unit()}
          </span>
          <div
            class={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.weatherCardConditionPill,
            )}
          >
            <span
              class={cm.cn(cm.iconGlyphFont, cm.textSize('2xl'))}
              style={{ 'font-variation-settings': "'FILL' 1" }}
              aria-hidden="true"
            >
              {conditionIcon()}
            </span>
            {props.condition ? (
              <span class={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                {props.condition}
              </span>
            ) : null}
          </div>
        </div>

        <div class={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), cm.sp('mt', 4))}>
          <PresentWhileNode node={props.feelsLikeLabel}>
            {(feelsLikeLabel) => (
              <span
                class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.weatherCardFeelsLike)}
              >
                {feelsLikeLabel()}
              </span>
            )}
          </PresentWhileNode>
          <PresentWhileNode node={props.highLowLabel}>
            {(highLowLabel) => (
              <span
                class={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.roundedFull,
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.weatherCardHighLowChip,
                )}
              >
                {highLowLabel()}
              </span>
            )}
          </PresentWhileNode>
          <PresentWhileNode node={props.updatedLabel}>
            {(updatedLabel) => (
              <span class={cm.cn(cm.textSize('xs'), cm.weatherCardUpdated)}>{updatedLabel()}</span>
            )}
          </PresentWhileNode>
        </div>
      </div>

      <div class={cm.cn(cm.sp('mt', 10), cm.h(24), cm.w('full'), cm.weatherCardContent)}>
        <svg
          class={cm.cn(cm.w('full'), cm.h('full'))}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={sparkline().fill} fill="white" opacity="0.25" />
          <path
            d={sparkline().stroke}
            fill="none"
            stroke="white"
            stroke-width="2.5"
            stroke-linecap="round"
          />
        </svg>
      </div>

      <div class={cm.cn(cm.weatherCardGlowLarge)} aria-hidden="true" />
      <div class={cm.cn(cm.weatherCardGlowSmall)} aria-hidden="true" />
    </div>
  )
}
