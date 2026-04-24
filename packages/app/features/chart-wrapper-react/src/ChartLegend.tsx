import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
export interface ChartLegendItem {
  id: string
  label: ReactNode
  /** Swatch color (any valid CSS color or ClassMap token string). */
  color: string
  /** Optional value / count display next to the label. */
  value?: ReactNode
  /** Whether the series is hidden (greyed out). */
  hidden?: boolean
}

interface ChartLegendProps {
  items: ChartLegendItem[]
  /** Called when an item is toggled. */
  onToggle?: (id: string) => void
  /** Layout direction. */
  layout?: 'horizontal' | 'vertical'
  /** Extra classes. */
  className?: string
}

/**
 * Chart legend — swatch + label (+ optional value) per series. When
 * `onToggle` is provided, items become buttons that toggle series
 * visibility.
 * @param root0
 * @param root0.items
 * @param root0.onToggle
 * @param root0.layout
 * @param root0.className
 */
export function ChartLegend({
  items,
  onToggle,
  layout = 'horizontal',
  className,
}: ChartLegendProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({
          direction: layout === 'vertical' ? 'col' : 'row',
          align: 'center',
          gap: 'md',
          wrap: 'wrap',
        }),
        className,
      )}
    >
      {items.map((it) => {
        const content = (
          <span className={cm.flex({ align: 'center', gap: 'xs' })}>
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: 2,
                background: it.color,
                opacity: it.hidden ? 0.3 : 1,
              }}
            />
            <span
              className={cm.cn(cm.textSize('sm'), it.hidden ? cm.textSize('sm') : undefined)}
              style={it.hidden ? { opacity: 0.5 } : undefined}
            >
              {it.label}
            </span>
            {it.value !== undefined && <span className={cm.textSize('sm')}>{it.value}</span>}
          </span>
        )
        if (!onToggle) return <span key={it.id}>{content}</span>
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onToggle(it.id)}
            aria-pressed={!it.hidden}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
