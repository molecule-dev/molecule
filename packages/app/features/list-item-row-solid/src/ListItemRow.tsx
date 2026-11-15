/**
 * Solid generic "thumbnail + text + actions" list-item row.
 *
 * Solid counterpart of `@molecule/app-list-item-row-react`'s `ListItemRow` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { ListItemRowProps } from './types.js'

/**
 * Generic "thumbnail + text + actions" row — used everywhere: navigation
 * lists, mobile menus, inbox-style threads, search results, picker dialogs,
 * bookmark lists, etc.
 *
 * Different from `<RowWithActions>` in `@molecule/app-data-table-ui-react`
 * in NOT being a `<tr>` — use this for non-table lists.
 *
 * @param props - Component props (see {@link ListItemRowProps}).
 * @returns The rendered list-item row.
 */
export const ListItemRow: Component<ListItemRowProps> = (props) => {
  const cm = getClassMap()
  const clickable = (): boolean => Boolean(props.onClick) && !props.disabled
  const padY = (): 2 | 3 => (props.density === 'compact' ? 2 : 3)
  return (
    <div
      role={props.onClick ? 'button' : undefined}
      tabindex={clickable() ? 0 : undefined}
      aria-selected={props.selected}
      aria-disabled={props.disabled}
      onClick={props.disabled ? undefined : props.onClick}
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 3),
        cm.sp('py', padY()),
        clickable() ? cm.cursorPointer : undefined,
        props.className,
      )}
      style={props.disabled ? { opacity: 0.5 } : undefined}
    >
      {props.leading && <div class={cm.shrink0}>{props.leading}</div>}
      <div class={cm.cn(cm.flex1, cm.stack(0))}>
        <div class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{props.title}</div>
        {props.subtitle && <div class={cm.textSize('sm')}>{props.subtitle}</div>}
        {props.metadata && <div class={cm.textSize('xs')}>{props.metadata}</div>}
      </div>
      {props.actions && (
        <div class={cm.shrink0} onClick={(event) => event.stopPropagation()}>
          {props.actions}
        </div>
      )}
    </div>
  )
}
