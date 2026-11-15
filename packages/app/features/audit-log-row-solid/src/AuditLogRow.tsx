/**
 * Solid audit / activity / event-log row: actor + action + target · timestamp,
 * optional old → new delta and environment / trace metadata.
 *
 * Solid counterpart of `@molecule/app-audit-log-row-react`'s `AuditLogRow` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { AuditLogRowProps } from './types.js'

/**
 * Whether an entry field is plain text: React renders strings and numbers as
 * one inline text run, and only a node value is rendered as an element.
 *
 * @param value - The entry field.
 * @returns True when the field renders as text.
 */
const isText = (value: JSX.Element): value is string | number =>
  typeof value === 'string' || typeof value === 'number'

/**
 * One audit / activity / event-log row. Shape: `[actor] [action] [target] ·
 * [timestamp]` with an optional `[old → new]` diff line and environment/trace
 * metadata. With `onClick` the row is promoted to a real button in the a11y
 * tree (`role="button"`, `tabindex="0"`) and Enter / Space activate it,
 * matching native button keyboard semantics.
 *
 * @param props - Component props (see {@link AuditLogRowProps}).
 * @returns The rendered audit log row.
 */
export const AuditLogRow: Component<AuditLogRowProps> = (props) => {
  const cm = getClassMap()
  const clickable = (): boolean => typeof props.onClick === 'function'

  // When the row is interactive, Enter / Space activate it (React's
  // `handleKeyDown`): preventDefault, then the click handler with no event.
  const handleKeyDown = (event: KeyboardEvent): void => {
    const onClick = props.onClick
    if (!onClick) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  return (
    <div
      class={cm.cn(
        cm.flex({ align: 'start', gap: 'sm' }),
        cm.sp('py', 2),
        clickable() ? cm.cursorPointer : undefined,
        props.className,
      )}
      role={clickable() ? 'button' : undefined}
      tabindex={clickable() ? 0 : undefined}
      data-mol-id="audit-log-row"
      onClick={props.onClick}
      onKeyDown={handleKeyDown}
    >
      <div class={cm.cn(cm.flex1, cm.stack(1))}>
        <div class={cm.cn(cm.textSize('sm'))}>
          <span class={cm.fontWeight('semibold')}>{props.entry.actor}</span>{' '}
          <span>{props.entry.action}</span>{' '}
          {props.entry.target && <span class={cm.fontWeight('medium')}>{props.entry.target}</span>}
          <span class={cm.cn(cm.sp('ml', 2), cm.textSize('xs'))}>· {props.entry.timestamp}</span>
          {props.entry.environment && (
            <span class={cm.cn(cm.sp('ml', 2), cm.textSize('xs'), cm.fontWeight('semibold'))}>
              {isText(props.entry.environment)
                ? `[${props.entry.environment}]`
                : ['[', props.entry.environment, ']']}
            </span>
          )}
        </div>
        {props.entry.oldValue !== undefined || props.entry.newValue !== undefined ? (
          <div class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}>
            {props.entry.oldValue !== undefined && (
              <span style={{ 'text-decoration': 'line-through', opacity: 0.7 }}>
                {props.entry.oldValue}
              </span>
            )}
            {props.entry.oldValue !== undefined && props.entry.newValue !== undefined && (
              <span aria-hidden="true">→</span>
            )}
            {props.entry.newValue !== undefined && <span>{props.entry.newValue}</span>}
          </div>
        ) : undefined}
        {props.entry.traceId && <span class={cm.textSize('xs')}>{props.entry.traceId}</span>}
      </div>
    </div>
  )
}
