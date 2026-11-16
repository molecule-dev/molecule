import type { Component, JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { ChartLegendItem, ChartLegendProps } from './types.js'

/**
 * The swatch's inline style (React's object, in Solid's kebab-case style
 * shape).
 *
 * @param item - The series entry.
 * @returns The style object.
 */
const swatchStyle = (item: ChartLegendItem): JSX.CSSProperties => ({
  display: 'inline-block',
  width: '10px',
  height: '10px',
  'border-radius': '2px',
  background: item.color,
  opacity: item.hidden ? 0.3 : 1,
})

/**
 * Chart legend — swatch + label (+ optional value) per series. When
 * `onToggle` is provided, items become buttons that toggle series visibility.
 *
 * This is the Solid counterpart of `@molecule/app-chart-wrapper-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @param props - Component props (see {@link ChartLegendProps}).
 * @returns The rendered chart legend.
 */
export const ChartLegend: Component<ChartLegendProps> = (props) => {
  const cm = getClassMap()
  const layout = (): 'horizontal' | 'vertical' => props.layout ?? 'horizontal'

  return (
    <div
      class={cm.cn(
        cm.flex({
          direction: layout() === 'vertical' ? 'col' : 'row',
          align: 'center',
          gap: 'md',
          wrap: 'wrap',
        }),
        props.className,
      )}
    >
      {props.items.map((item) => {
        const content = (
          <span class={cm.flex({ align: 'center', gap: 'xs' })}>
            <span aria-hidden="true" style={swatchStyle(item)} />
            <span
              class={cm.cn(cm.textSize('sm'), item.hidden ? cm.textSize('sm') : undefined)}
              style={item.hidden ? { opacity: 0.5 } : undefined}
            >
              {item.label}
            </span>
            {item.value !== undefined && <span class={cm.textSize('sm')}>{item.value}</span>}
          </span>
        )
        if (!props.onToggle) return <span>{content}</span>
        return (
          <button
            type="button"
            onClick={() => props.onToggle?.(item.id)}
            aria-pressed={!item.hidden}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
