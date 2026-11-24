/**
 * Solid avatar + name + optional subtitle row.
 *
 * Solid counterpart of `@molecule/app-avatar-stack-react`'s `UserChip` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { type Component, type JSX, Show, splitProps } from 'solid-js'

import { PresentWhileNode } from '@molecule/app-solid'
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
  const [local, rest] = splitProps(props, [
    'name',
    'href',
    'nameLinkProps',
    'src',
    'subtitle',
    'trailing',
    'size',
    'className',
    'class',
  ])
  const size = (): 'xs' | 'sm' | 'md' | 'lg' => local.size ?? 'sm'
  // One spread preserves explicit undefined attributes; Solid's mergeProps would
  // otherwise keep the default marker when the caller explicitly removes it.
  const nameLinkAttributes = (): JSX.AnchorHTMLAttributes<HTMLAnchorElement> & {
    'data-mol-id'?: string
  } => ({
    'data-mol-id': 'user-chip-profile',
    ...local.nameLinkProps,
    href: local.href,
    class: cm.cn(
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      local.nameLinkProps?.className,
      local.nameLinkProps?.class,
    ),
  })

  return (
    <div
      {...rest}
      class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), local.className, local.class)}
    >
      <Show
        when={local.href !== undefined}
        fallback={<Avatar src={local.src} alt={local.name} name={local.name} size={size()} />}
      >
        <div aria-hidden="true">
          <Avatar src={local.src} alt={local.name} name={local.name} size={size()} />
        </div>
      </Show>
      <div class={cm.cn(cm.flex1, cm.stack(0 as const))}>
        <Show
          when={local.href !== undefined}
          fallback={
            <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{local.name}</span>
          }
        >
          <a {...nameLinkAttributes()}>{local.name}</a>
        </Show>
        <PresentWhileNode node={local.subtitle}>
          {(subtitle) => <span class={cm.textSize('xs')}>{subtitle()}</span>}
        </PresentWhileNode>
      </div>
      {local.trailing}
    </div>
  )
}
