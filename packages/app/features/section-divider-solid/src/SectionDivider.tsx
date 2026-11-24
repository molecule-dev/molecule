import type { Component } from 'solid-js'

import { PresentWhileNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { SectionDividerProps } from './types.js'

/**
 * Horizontal divider with an optional centered label, common as "OR" between
 * auth options, "Today" between feed days, "—" between sections.
 *
 * This is the Solid counterpart of `@molecule/app-section-divider-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input. `align` positions the label: `'center'` (default) draws
 * lines on both sides, `'start'` / `'end'` put the label at that edge with a
 * single line filling the rest. Lines use `currentColor` at 20% opacity, so
 * they inherit the local text color in both light and dark themes.
 *
 * @param props - Component props (see {@link SectionDividerProps}).
 * @returns The rendered section divider.
 */
export const SectionDivider: Component<SectionDividerProps> = (props) => {
  const cm = getClassMap()
  const align = (): 'start' | 'center' | 'end' => props.align ?? 'center'
  const lineStyle = { 'border-top': '1px solid currentColor', opacity: 0.2 }
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), props.className)}
    >
      {(align() === 'center' || align() === 'end') && (
        <span class={cm.flex1} aria-hidden="true" style={lineStyle} />
      )}
      <PresentWhileNode node={props.children}>
        {(content) => (
          <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{content()}</span>
        )}
      </PresentWhileNode>
      {(align() === 'center' || align() === 'start') && (
        <span class={cm.flex1} aria-hidden="true" style={lineStyle} />
      )}
    </div>
  )
}
