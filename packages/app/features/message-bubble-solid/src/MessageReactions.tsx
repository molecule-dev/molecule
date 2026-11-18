import { type Component, For, type JSX, Show } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { MessageReactionsProps } from './types.js'

/**
 * Row of reaction chips below a message body. Each chip shows emoji +
 * count; when the current user reacted the chip is marked with
 * `aria-pressed` only — no visual highlight ships.
 *
 * This is the Solid counterpart of `@molecule/app-message-bubble-react`'s
 * `MessageReactions`: the same props (React names) and the same DOM for the
 * same input.
 *
 * @param props - Component props (see {@link MessageReactionsProps}).
 * @returns The rendered reaction row.
 */
export const MessageReactions: Component<MessageReactionsProps> = (props): JSX.Element => {
  const cm = getClassMap()
  return (
    <div class={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }), props.className)}>
      <For each={props.reactions}>
        {(reaction) => (
          <button
            type="button"
            onClick={() => props.onToggle?.(reaction.emoji)}
            aria-pressed={reaction.reactedByMe}
            class={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.roundedFull,
            )}
          >
            <span>{reaction.emoji}</span>
            <span>{reaction.count}</span>
          </button>
        )}
      </For>
      <Show when={props.onAdd}>
        <button
          type="button"
          onClick={(event) => props.onAdd?.(event)}
          class={cm.cn(cm.sp('px', 2), cm.sp('py', 1), cm.textSize('xs'))}
        >
          +
        </button>
      </Show>
    </div>
  )
}
