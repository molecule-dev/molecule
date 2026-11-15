/**
 * Solid avatar + name + optional subtitle row.
 *
 * Solid counterpart of `@molecule/app-avatar-stack-react`'s `UserChip` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { type Component, Show } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-solid'

import type { UserChipProps } from './types.js'

/**
 * Avatar + name + optional subtitle row — useful in dropdowns, mention
 * pickers, assignment popovers, and row-level user references.
 *
 * @param props - Component props (see {@link UserChipProps}).
 * @returns The rendered user chip.
 */
export const UserChip: Component<UserChipProps> = (props) => {
  const cm = getClassMap()
  const size = (): 'xs' | 'sm' | 'md' | 'lg' => props.size ?? 'sm'

  return (
    <div class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), props.className)}>
      <Avatar src={props.src} alt={props.name} name={props.name} size={size()} />
      <div class={cm.cn(cm.flex1, cm.stack(0 as const))}>
        <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{props.name}</span>
        <Show when={props.subtitle}>
          <span class={cm.textSize('xs')}>{props.subtitle}</span>
        </Show>
      </div>
      {props.trailing}
    </div>
  )
}
