/**
 * Solid tiny inline trend chart — line, bar, or dot variants.
 *
 * Solid counterpart of `@molecule/app-sparkline-react`'s `Sparkline` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { type Component, Index, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { SparklineProps } from './types.js'

/**
 * Tiny inline trend chart — line, bar, or dot variants. Uses SVG with no
 * external library so it works inside cards, table cells, KPI tiles, etc.
 * without a chart bond. Same props, same DOM as
 * `@molecule/app-sparkline-react`'s `Sparkline`. The series renders
 * index-keyed (`Index`), matching React's per-item keys, so a new array of
 * equal values keeps the rendered nodes.
 *
 * @param props - Component props (see {@link SparklineProps}).
 * @returns The rendered sparkline.
 */
export const Sparkline: Component<SparklineProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const variant = (): 'line' | 'bar' | 'dot' => props.variant ?? 'line'
  const svgWidth = (): number => props.width ?? 80
  const svgHeight = (): number => props.height ?? 24
  const color = (): string => props.color ?? 'currentColor'
  const ariaLabel = (): string =>
    props.ariaLabel ??
    t('sparkline.aria.trendSparkline', undefined, { defaultValue: 'Trend sparkline' })
  const min = (): number => Math.min(...props.values)
  const max = (): number => Math.max(...props.values)
  const range = (): number => max() - min() || 1
  const stepX = (): number =>
    props.values.length === 1 ? 0 : svgWidth() / (props.values.length - 1)
  const y = (v: number): number => svgHeight() - ((v - min()) / range()) * svgHeight()
  const points = (): string => props.values.map((v, i) => `${i * stepX()},${y(v)}`).join(' ')
  const barWidth = (): number => Math.max(2, svgWidth() / props.values.length - 2)
  return (
    <Show when={props.values.length > 0}>
      <svg
        width={svgWidth()}
        height={svgHeight()}
        viewBox={`0 0 ${svgWidth()} ${svgHeight()}`}
        role="img"
        aria-label={ariaLabel()}
        class={cm.cn(props.className)}
      >
        <Show when={variant() === 'line'}>
          <polyline fill="none" stroke={color()} stroke-width={1.5} points={points()} />
        </Show>
        <Show when={variant() === 'bar'}>
          <Index each={props.values}>
            {(item, i) => (
              <rect
                x={i * (barWidth() + 2)}
                y={svgHeight() - ((item() - min()) / range()) * svgHeight()}
                width={barWidth()}
                height={((item() - min()) / range()) * svgHeight()}
                fill={color()}
              />
            )}
          </Index>
        </Show>
        <Show when={variant() === 'dot'}>
          <Index each={props.values}>
            {(item, i) => <circle cx={i * stepX()} cy={y(item())} r={1.5} fill={color()} />}
          </Index>
        </Show>
      </svg>
    </Show>
  )
}
