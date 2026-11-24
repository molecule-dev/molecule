/**
 * Solid generic "thumbnail + text + actions" list-item row.
 *
 * Solid counterpart of `@molecule/app-list-item-row-react`'s `ListItemRow` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { type Component, createUniqueId, Show } from 'solid-js'

import { PresentWhileNode, ResolveNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { OptimisticToggleButton } from '@molecule/app-ui-solid'

import type { ListItemRowProps } from './types.js'

/**
 * Generic "thumbnail + text + actions" row — used everywhere: navigation
 * lists, mobile menus, inbox-style threads, search results, picker dialogs,
 * bookmark lists, etc.
 *
 * With `onClick` the whole row is clickable through a transparent native
 * button over it, named by the title (`aria-labelledby`); Enter / Space on
 * that button run the same handler a click anywhere on the row runs, and the
 * inner controls (the `actions` slot) sit above the button and keep their own
 * clicks.
 *
 * @param props - Component props (see {@link ListItemRowProps}).
 * @returns The rendered list-item row.
 */
export const ListItemRow: Component<ListItemRowProps> = (props) => {
  const cm = getClassMap()
  const nameId = createUniqueId()
  const padY = (): 2 | 3 => (props.density === 'compact' ? 2 : 3)
  return (
    <div
      aria-current={props.selected ? 'true' : undefined}
      aria-disabled={props.disabled}
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 3),
        cm.sp('py', padY()),
        props.onClick ? cm.position('relative') : undefined,
        props.className,
      )}
      style={props.disabled ? { opacity: 0.5 } : undefined}
    >
      {props.onClick && (
        <button
          type="button"
          aria-labelledby={nameId}
          data-mol-id="list-item-row-open"
          disabled={props.disabled}
          onClick={() => {
            if (!props.disabled) props.onClick?.()
          }}
          /* mol-bespoke-button: the whole row is the hit area, not a CTA — an
             empty, transparent button over the row; the inline background/
             border/padding are native resets. React writes the shorthand
             `border: 'none'` and `padding: 0`, which the CSSOM serializes as
             `border: medium` and `0px` — Solid writes the style attribute
             directly, so the port writes that same serialized form (identical
             computed style). */
          class={cm.cn(
            cm.position('absolute'),
            cm.inset0,
            props.disabled ? undefined : cm.cursorPointer,
          )}
          style={{ background: 'transparent', border: 'medium', padding: '0px' }}
        />
      )}
      <PresentWhileNode node={props.leading}>
        {(leading) => <div class={cm.shrink0}>{leading()}</div>}
      </PresentWhileNode>
      <div class={cm.cn(cm.flex1, cm.stack(0))}>
        <div
          id={props.onClick ? nameId : undefined}
          class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
        >
          {props.title}
        </div>
        {props.subtitle && <div class={cm.textSize('sm')}>{props.subtitle}</div>}
        {props.metadata && <div class={cm.textSize('xs')}>{props.metadata}</div>}
      </div>
      <ResolveNode node={props.actions}>
        {(actions, hasActions) => (
          <Show when={props.toggle || hasActions()}>
            <div class={cm.cn(cm.shrink0, cm.position('relative'))}>
              {props.toggle && <OptimisticToggleButton {...props.toggle} />}
              {actions()}
            </div>
          </Show>
        )}
      </ResolveNode>
    </div>
  )
}
