import { type Component, For, type JSX, Show } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import { MessageBubble } from './MessageBubble.jsx'
import type { MessageData, MessageListProps } from './types.js'

/**
 * Vertical list of `<MessageBubble>`s with optional date separators.
 *
 * With no messages and an empty state React renders the empty state alone;
 * otherwise it renders the stacked wrapper. React keys each row by the
 * message's `id` value, so a re-passed or re-ordered array keeps the rendered
 * rows per id; Solid's `For` keys by reference, so the rows are keyed through
 * stable per-id records the same way the package's sibling lists are.
 *
 * This is the Solid counterpart of `@molecule/app-message-bubble-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @param props - Component props (see {@link MessageListProps}).
 * @returns The rendered message list.
 */
export const MessageList: Component<MessageListProps> = (props): JSX.Element => {
  const cm = getClassMap()

  /** One stable record per message id, created on first sight. */
  interface Row {
    id: string
  }
  const records = new Map<string, Row>()
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const rows = props.messages.map((message) => {
      seen.add(message.id)
      let row = records.get(message.id)
      if (!row) {
        row = { id: message.id }
        records.set(message.id, row)
      }
      return row
    })
    for (const id of [...records.keys()]) if (!seen.has(id)) records.delete(id)
    return rows
  }
  const messageFor = (id: string): MessageData =>
    props.messages.find((message) => message.id === id) as MessageData
  const indexFor = (id: string): number => props.messages.findIndex((message) => message.id === id)

  return (
    <Show
      when={props.messages.length === 0 ? props.emptyState : undefined}
      fallback={
        <div class={cm.cn(cm.stack(3), props.className)}>
          <For each={keyedRows()}>
            {(row): JSX.Element => (
              <div class={cm.stack(2)}>
                {props.renderDateSeparator?.(messageFor(row.id), indexFor(row.id))}
                <MessageBubble
                  message={messageFor(row.id)}
                  isSelf={messageFor(row.id).author.id === props.selfAuthorId}
                />
              </div>
            )}
          </For>
        </div>
      }
    >
      {(empty) => empty()}
    </Show>
  )
}
