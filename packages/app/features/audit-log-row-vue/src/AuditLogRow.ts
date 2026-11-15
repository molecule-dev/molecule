/**
 * Vue audit / activity / event-log row: actor + action + target · timestamp,
 * optional old → new delta and environment / trace metadata.
 *
 * Vue counterpart of `@molecule/app-audit-log-row-react`'s `AuditLogRow` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { AuditLogRowProps } from './types.js'

/**
 * One audit / activity / event-log row. Shape: `[actor] [action] [target] ·
 * [timestamp]` with an optional `[old → new]` diff line and environment/trace
 * metadata. With `onClick` the row is promoted to a real button in the a11y
 * tree (`role="button"`, `tabindex="0"`) and Enter / Space activate it,
 * matching native button keyboard semantics.
 *
 * @param props - Component props (see {@link AuditLogRowProps}).
 * @returns The audit log row component.
 */
export const AuditLogRow = defineComponent({
  name: 'AuditLogRow',
  props: {
    entry: { type: Object as PropType<AuditLogRowProps['entry']>, required: true },
    onClick: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    className: { type: String, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()

    // When the row is interactive, Enter / Space activate it (React's
    // `handleKeyDown`): preventDefault, then the click handler with no event.
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!props.onClick) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        props.onClick()
      }
    }

    return (): VNode => {
      const { actor, action, target, timestamp, oldValue, newValue, environment, traceId } =
        props.entry
      const showDelta = oldValue !== undefined || newValue !== undefined
      const line: VNodeChild[] = [
        h('span', { class: cm.fontWeight('semibold') }, [actor]),
        ' ',
        h('span', undefined, [action]),
        ' ',
      ]
      if (target) line.push(h('span', { class: cm.fontWeight('medium') }, [target]))
      line.push(h('span', { class: cm.cn(cm.sp('ml', 2), cm.textSize('xs')) }, ['· ', timestamp]))
      if (environment)
        line.push(
          h(
            'span',
            {
              class: cm.cn(cm.sp('ml', 2), cm.textSize('xs'), cm.fontWeight('semibold')),
            },
            ['[', environment, ']'],
          ),
        )
      return h(
        'div',
        {
          onClick: props.onClick,
          onKeydown: handleKeyDown,
          role: props.onClick ? 'button' : undefined,
          tabindex: props.onClick ? 0 : undefined,
          'data-mol-id': 'audit-log-row',
          class: cm.cn(
            cm.flex({ align: 'start', gap: 'sm' }),
            cm.sp('py', 2),
            props.onClick ? cm.cursorPointer : undefined,
            props.className,
          ),
        },
        [
          h('div', { class: cm.cn(cm.flex1, cm.stack(1)) }, [
            h('div', { class: cm.cn(cm.textSize('sm')) }, line),
            ...(showDelta
              ? [
                  h(
                    'div',
                    { class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs')) },
                    [
                      ...(oldValue !== undefined
                        ? [
                            h(
                              'span',
                              {
                                style: { textDecoration: 'line-through', opacity: 0.7 },
                              },
                              [oldValue],
                            ),
                          ]
                        : []),
                      ...(oldValue !== undefined && newValue !== undefined
                        ? [h('span', { 'aria-hidden': 'true' }, ['→'])]
                        : []),
                      ...(newValue !== undefined ? [h('span', undefined, [newValue])] : []),
                    ],
                  ),
                ]
              : []),
            ...(traceId ? [h('span', { class: cm.textSize('xs') }, [traceId])] : []),
          ]),
        ],
      )
    }
  },
})
