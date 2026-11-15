/**
 * Solid structured label/value pair list — the counterpart of
 * `@molecule/app-info-display-react`'s `DefinitionList`: the same props (React
 * names), the same ClassMap tokens, and the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { DefinitionListProps } from './types.js'

/**
 * Structured label/value pair list. Use standalone or inside `<InfoCard>`. Apps
 * pass already-formatted values (dates, currency, status pills, etc.) as nodes.
 *
 * `columns={1}` stacks each label above its value; `2`/`3` arrange the fields in
 * a grid. The list uses ClassMap tokens only, so the styling library can be
 * swapped without touching consumers.
 *
 * This is the Solid counterpart of `@molecule/app-info-display-react`'s
 * `DefinitionList`.
 *
 * @param props - Component props (see {@link DefinitionListProps}).
 * @returns The rendered definition list.
 */
export const DefinitionList: Component<DefinitionListProps> = (props) => {
  const cm = getClassMap()
  const columns = (): 1 | 2 | 3 => props.columns ?? 1

  return (
    <dl
      class={cm.cn(
        columns() === 1 ? cm.stack(3) : cm.grid({ cols: columns(), gap: 'md' }),
        props.className,
      )}
    >
      {props.fields.map((field) => (
        <div class={cm.stack(0 as const)}>
          <dt
            class={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 'xs' }),
            )}
          >
            {field.icon}
            <span>{field.label}</span>
          </dt>
          <dd class={cm.textSize('sm')}>{field.value}</dd>
        </div>
      ))}
    </dl>
  )
}
