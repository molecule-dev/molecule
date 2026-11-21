/**
 * Solid read-only tag list: every saved tag as a chip, one list item per value.
 *
 * Solid counterpart of `@molecule/app-tag-input-react`'s `TagList` — the same
 * props (React names), the same ClassMap tokens and the same DOM for the same
 * input.
 *
 * @module
 */

import { type Component, For, splitProps } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import { TagChip } from './TagChip.jsx'
import type { TagListProps } from './types.js'

/**
 * Display all saved tags on a detail or preview screen, without an editor or
 * remove controls. The component owns iteration. List attributes such as id
 * and aria-label go on the list itself.
 *
 * @param props - Component props (see {@link TagListProps}).
 * @returns The rendered tag list.
 */
export const TagList: Component<TagListProps> = (props) => {
  const cm = getClassMap()
  const [local, listProps] = splitProps(props, [
    'value',
    'className',
    'class',
    'itemClassName',
    'renderTag',
  ])
  return (
    <ul
      {...listProps}
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
        local.className,
        local.class,
      )}
    >
      <For each={local.value}>
        {(tag, index) => (
          <li class={local.itemClassName}>
            {local.renderTag ? local.renderTag(tag, index()) : <TagChip>{tag}</TagChip>}
          </li>
        )}
      </For>
    </ul>
  )
}
