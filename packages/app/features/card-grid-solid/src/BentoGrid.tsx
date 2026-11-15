import { type Component, For } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { BentoGridProps, BentoItem } from './types.js'

/**
 * Bento-style grid — items span multiple cells for a magazine / dashboard
 * layout. Works in two modes: (a) col/row-span driven, (b) named-areas
 * driven via the `areas` prop.
 *
 * This is the Solid counterpart of `@molecule/app-card-grid-react`'s
 * `BentoGrid`: the same props (React names), the same ClassMap tokens, and the
 * same DOM for the same input. Solid's style object takes hyphenated CSS
 * property names, which DOM `setProperty` requires.
 *
 * @param props - Component props (see {@link BentoGridProps}).
 * @returns The rendered bento grid.
 */
export const BentoGrid: Component<BentoGridProps> = (props) => {
  const cm = getClassMap()
  const columns = (): number => props.columns ?? 12
  const gap = (): 'xs' | 'sm' | 'md' | 'lg' => props.gap ?? 'md'
  const gridStyle = (): Record<string, string> =>
    props.areas
      ? { display: 'grid', 'grid-template-areas': props.areas }
      : { display: 'grid', 'grid-template-columns': `repeat(${columns()}, minmax(0, 1fr))` }
  const itemStyle = (item: BentoItem): Record<string, string | undefined> =>
    props.areas
      ? { 'grid-area': item.area }
      : {
          'grid-column': `span ${item.colSpan ?? 4}`,
          'grid-row': `span ${item.rowSpan ?? 1}`,
        }
  return (
    <div class={cm.cn(cm.grid({ gap: gap() }), props.className)} style={gridStyle()}>
      <For each={props.items}>{(item) => <div style={itemStyle(item)}>{item.content}</div>}</For>
    </div>
  )
}
