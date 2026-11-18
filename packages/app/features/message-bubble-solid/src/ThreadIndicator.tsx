import type { Component, JSX } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { ThreadIndicatorProps } from './types.js'

/**
 * "3 replies · last Monday" indicator rendered below a message bubble.
 * Clicking opens the thread view.
 *
 * This is the Solid counterpart of `@molecule/app-message-bubble-react`'s
 * `ThreadIndicator`: the same props (React names), the same DOM for the same
 * input, and the same pluralized `t('thread.replies', { count }, { count })`
 * call.
 *
 * @param props - Component props (see {@link ThreadIndicatorProps}).
 * @returns The rendered thread indicator.
 */
export const ThreadIndicator: Component<ThreadIndicatorProps> = (props): JSX.Element => {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={(event) => props.onOpen?.(event)}
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.textSize('xs'),
        cm.link,
        props.className,
      )}
    >
      <span class={cm.fontWeight('semibold')}>
        {t(
          'thread.replies',
          { count: props.replyCount },
          {
            count: props.replyCount,
            defaultValue: '{{count}} replies',
            defaultValue_one: '{{count}} reply',
          },
        )}
      </span>
      {props.lastReplyAt ? (
        <span>
          {'· '}
          {props.lastReplyAt}
        </span>
      ) : null}
    </button>
  )
}
