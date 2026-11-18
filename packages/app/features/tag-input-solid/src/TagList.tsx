/**
 * Solid read-only tag list: every saved tag as a chip, one list item per value.
 *
 * Solid counterpart of `@molecule/app-tag-input-react`'s `TagList` — the same
 * props (React names), the same ClassMap tokens and the same DOM for the same
 * input.
 *
 * @module
 */

import { type Component, For } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import { TagChip } from './TagChip.jsx'
import type { TagListProps } from './types.js'

/**
 * Display all saved tags on a detail or preview screen, without an editor or
 * remove controls. The component owns iteration; the app can supply each tag's
 * content and list classes.
 *
 * @param props - Component props (see {@link TagListProps}).
 * @returns The rendered tag list.
 */
export const TagList: Component<TagListProps> = (props) => {
  const cm = getClassMap()
  return (
    <ul class={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }), props.className)}>
      <For each={props.value}>
        {(tag, index) => (
          <li class={props.itemClassName}>
            {props.renderTag ? props.renderTag(tag, index()) : <TagChip>{tag}</TagChip>}
          </li>
        )}
      </For>
    </ul>
  )
}
