/**
 * `@molecule/app-message-bubble-react` cases: the message bubble, the meta row,
 * the attachment rows, the reaction chips, the thread indicator, the message
 * list and the composer.
 *
 * Every runtime export of the React package is covered: `MessageAttachments`,
 * `MessageBubble`, `MessageComposer`, `MessageList`, `MessageMeta`,
 * `MessageReactions` and `ThreadIndicator`. Every node-valued field
 * (`MessageMeta`'s `author` / `timestamp`, `MessageData`'s `body` /
 * `timestamp` / `attachments` / `reactions` / `thread`, an attachment's `icon`
 * / `action`, `ThreadIndicator`'s `lastReplyAt`, `MessageList`'s `emptyState`
 * and `renderDateSeparator`, `MessageComposer`'s `leading` / `trailing`) is
 * exercised as plain text and as a rendered node, and every callback
 * (`onToggle`, `onAdd`, `onOpen`, `onSubmit`) by a click or a key press.
 * `MessageComposer` keeps its own draft, so its cases type, submit and clear it.
 *
 * @module
 */

import type { NodeSpec } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** A single message with plain-text body and timestamp. */
const message = (id: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  author: { id: `u-${id}`, name: `name-${id}` },
  body: `body-${id}`,
  timestamp: `ts-${id}`,
  ...over,
})

/** Three messages, as an app's chat pane would hold them. */
const messages = [message('a'), message('b'), message('c')]

/** A node body: a paragraph of rich content. */
const bodyNode: NodeSpec[] = [{ tag: 'p', attrs: { 'data-body': '' }, children: ['Rich body'] }]

/** A node timestamp. */
const timeNode: NodeSpec[] = [{ tag: 'time', attrs: { 'data-ts': '' }, children: ['09:30'] }]

/** An attachment icon and a download action, as the package's README shows. */
const iconNode: NodeSpec[] = [{ tag: 'i', attrs: { 'data-icon': '' } }]
const actionNode: NodeSpec[] = [
  { tag: 'button', attrs: { type: 'button', 'data-action': '' }, children: ['Download'] },
]

/** `@molecule/app-message-bubble-react`. */
export const messageBubbleFeature: FeatureCases = {
  package: '@molecule/app-message-bubble-react',
  families: [
    {
      component: 'MessageMeta',
      cases: [
        {
          name: 'an author and a timestamp',
          props: { author: 'Alice', timestamp: '10:30' },
        },
        {
          name: 'node author and timestamp',
          props: {
            author: { $nodes: [{ tag: 'strong', children: ['Alice'] }] },
            timestamp: { $nodes: [{ tag: 'time', children: ['10:30'] }] },
          },
        },
        {
          name: 'a text author with a node timestamp',
          props: { author: 'Alice', timestamp: { $nodes: timeNode } },
        },
        {
          name: 'an empty author',
          props: { author: '', timestamp: '10:30' },
        },
        {
          name: 'className passthrough',
          props: { author: 'Alice', timestamp: '10:30', className: 'parity-token' },
        },
        {
          name: 'the author and timestamp change',
          props: { author: 'Alice', timestamp: '10:30' },
          interactions: [{ type: 'props', props: { author: 'Bob', timestamp: '10:31' } }],
        },
        {
          name: 'the className is removed',
          props: { author: 'Alice', timestamp: '10:30', className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: undefined } }],
        },
      ],
    },
    {
      component: 'MessageAttachments',
      cases: [
        {
          name: 'two attachments',
          props: {
            attachments: [
              { id: 'a', name: 'file-a' },
              { id: 'b', name: 'file-b' },
            ],
          },
        },
        {
          name: 'an attachment with a size label',
          props: { attachments: [{ id: 'a', name: 'file-a', size: '2.3 MB' }] },
        },
        {
          name: 'an attachment without a size label',
          props: { attachments: [{ id: 'a', name: 'file-a' }] },
        },
        {
          name: 'an empty size label renders nothing',
          props: { attachments: [{ id: 'a', name: 'file-a', size: '' }] },
        },
        {
          name: 'an attachment icon and action',
          props: {
            attachments: [
              {
                id: 'a',
                name: 'file-a',
                icon: { $nodes: iconNode },
                action: { $nodes: actionNode },
              },
            ],
          },
        },
        {
          name: 'an icon alone',
          props: { attachments: [{ id: 'a', name: 'file-a', icon: { $nodes: iconNode } }] },
        },
        {
          name: 'an action alone',
          props: { attachments: [{ id: 'a', name: 'file-a', action: { $nodes: actionNode } }] },
        },
        {
          name: 'no attachments',
          props: { attachments: [] },
        },
        {
          name: 'className passthrough',
          props: { attachments: [{ id: 'a', name: 'file-a' }], className: 'parity-token' },
        },
        {
          name: 'the attachments change',
          props: { attachments: [{ id: 'a', name: 'file-a' }] },
          interactions: [
            {
              type: 'props',
              props: {
                attachments: [
                  { id: 'a', name: 'file-a', size: '1 KB' },
                  { id: 'b', name: 'file-b' },
                ],
              },
            },
          ],
        },
      ],
    },
    {
      component: 'MessageReactions',
      cases: [
        {
          name: 'two reactions',
          props: {
            reactions: [
              { emoji: '👍', count: 3 },
              { emoji: '🎉', count: 1 },
            ],
          },
        },
        {
          name: 'the viewer reacted to one chip',
          props: {
            reactions: [
              { emoji: '👍', count: 3, reactedByMe: true },
              { emoji: '🎉', count: 1, reactedByMe: false },
              { emoji: '❤️', count: 2 },
            ],
          },
        },
        {
          name: 'no reactions',
          props: { reactions: [] },
        },
        {
          name: 'no add button without onAdd',
          props: { reactions: [{ emoji: '👍', count: 1 }] },
        },
        {
          name: 'a chip is toggled',
          props: { reactions: [{ emoji: '👍', count: 1 }] },
          callbacks: ['onToggle'],
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'the add button is clicked',
          props: { reactions: [{ emoji: '👍', count: 1 }] },
          callbacks: ['onAdd'],
          interactions: [{ type: 'click', selector: 'button:last-of-type' }],
        },
        {
          name: 'className passthrough',
          props: { reactions: [{ emoji: '👍', count: 1 }], className: 'parity-token' },
        },
        {
          name: 'the reactions change',
          props: { reactions: [{ emoji: '👍', count: 1 }] },
          interactions: [
            {
              type: 'props',
              props: {
                reactions: [
                  { emoji: '👍', count: 2, reactedByMe: true },
                  { emoji: '🎉', count: 1 },
                ],
              },
            },
          ],
        },
      ],
    },
    {
      component: 'ThreadIndicator',
      cases: [
        { name: 'one reply', props: { replyCount: 1 } },
        { name: 'several replies', props: { replyCount: 4 } },
        { name: 'no replies', props: { replyCount: 0 } },
        {
          name: 'a node last reply time',
          props: {
            replyCount: 3,
            lastReplyAt: { $nodes: [{ tag: 'time', children: ['last Monday'] }] },
          },
        },
        {
          name: 'a text last reply time',
          props: { replyCount: 3, lastReplyAt: 'last Monday' },
        },
        {
          name: 'the indicator is clicked',
          props: { replyCount: 2 },
          callbacks: ['onOpen'],
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'className passthrough',
          props: { replyCount: 1, className: 'parity-token' },
        },
        {
          name: 'the reply count changes',
          props: { replyCount: 1 },
          interactions: [{ type: 'props', props: { replyCount: 5 } }],
        },
        {
          name: 'the last reply time is removed',
          props: { replyCount: 2, lastReplyAt: 'yesterday' },
          interactions: [{ type: 'props', props: { lastReplyAt: undefined } }],
        },
      ],
    },
    {
      component: 'MessageBubble',
      cases: [
        { name: 'a plain message', props: { message: message('a') } },
        {
          name: 'an avatar source',
          props: {
            message: message('a', {
              author: { id: 'u-a', name: 'Alice', avatarSrc: '/alice.png' },
            }),
          },
        },
        {
          name: 'the viewer own message',
          props: { message: message('a'), isSelf: true },
        },
        {
          name: 'the meta row is hidden',
          props: { message: message('a'), showMeta: false },
        },
        {
          name: 'a node body and timestamp',
          props: {
            message: message('a', {
              body: { $nodes: bodyNode },
              timestamp: { $nodes: timeNode },
            }),
          },
        },
        {
          name: 'text attachments, reactions and thread',
          props: {
            message: message('a', {
              attachments: 'att-text',
              reactions: 'rx-text',
              thread: 'thr-text',
            }),
          },
        },
        {
          name: 'node attachments, reactions and thread',
          props: {
            message: message('a', {
              attachments: { $nodes: [{ tag: 'div', attrs: { 'data-att': '' } }] },
              reactions: { $nodes: [{ tag: 'div', attrs: { 'data-rx': '' } }] },
              thread: { $nodes: [{ tag: 'div', attrs: { 'data-thr': '' } }] },
            }),
          },
        },
        {
          name: 'empty attachments, reactions and thread render nothing',
          props: {
            message: message('a', { attachments: '', reactions: '', thread: '' }),
          },
        },
        {
          name: 'className passthrough',
          props: { message: message('a'), className: 'parity-token' },
        },
        {
          name: 'the meta row is hidden at runtime',
          props: { message: message('a') },
          interactions: [{ type: 'props', props: { showMeta: false } }],
        },
        {
          name: 'an avatar image error falls back to initials',
          props: {
            message: message('a', {
              author: { id: 'u-a', name: 'Ada Lovelace', avatarSrc: '/broken.png' },
            }),
          },
          interactions: [{ type: 'event', selector: 'img', event: 'error' }],
        },
        {
          name: 'the message changes',
          props: { message: message('a') },
          interactions: [{ type: 'props', props: { message: message('b', { body: 'body-b2' }) } }],
        },
      ],
    },
    {
      component: 'MessageList',
      cases: [
        { name: 'one message', props: { messages: [messages[0]] } },
        { name: 'three messages', props: { messages } },
        { name: 'no messages and no empty state', props: { messages: [] } },
        {
          name: 'an empty state when the list is empty',
          props: {
            messages: [],
            emptyState: {
              $nodes: [{ tag: 'p', attrs: { 'data-empty': '' }, children: ['Nothing yet'] }],
            },
          },
        },
        {
          name: 'a text empty state when the list is empty',
          props: { messages: [], emptyState: 'Nothing yet' },
        },
        {
          name: 'the empty state is ignored when messages exist',
          props: {
            messages: [messages[0]],
            emptyState: { $nodes: [{ tag: 'p', attrs: { 'data-empty': '' }, children: ['None'] }] },
          },
        },
        {
          name: 'the viewer own messages are aligned right',
          props: { messages, selfAuthorId: 'u-b' },
        },
        {
          name: 'date separators as nodes',
          props: {
            messages: [messages[0], messages[1]],
            renderDateSeparator: {
              $fn: 'renderDateSeparator',
              nodes: [{ tag: 'hr', attrs: { 'data-sep': '{0.id}' } }],
            },
          },
        },
        {
          name: 'a text date separator',
          props: {
            messages: [messages[0], messages[1]],
            renderDateSeparator: {
              $fn: 'renderDateSeparator',
              nodes: ['— {0.id} #{1} —'],
            },
          },
        },
        {
          name: 'className passthrough',
          props: { messages: [messages[0]], className: 'parity-token' },
        },
        {
          name: 'more messages arrive',
          props: { messages: [messages[0]] },
          interactions: [{ type: 'props', props: { messages } }],
        },
        {
          name: 'every message is emptied',
          props: { messages },
          interactions: [{ type: 'props', props: { messages: [] } }],
        },
        {
          name: 'the empty state appears once the messages are gone',
          props: {
            messages: [messages[0]],
            emptyState: { $nodes: [{ tag: 'p', attrs: { 'data-empty': '' } }] },
          },
          interactions: [{ type: 'props', props: { messages: [] } }],
        },
        {
          name: 'the className is removed',
          props: { messages: [messages[0]], className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: undefined } }],
        },
      ],
      keyedLists: [{ prop: 'messages', selector: 'article', caseName: 'three messages' }],
    },
    {
      component: 'MessageComposer',
      cases: [
        { name: 'defaults', callbacks: ['onSubmit'] },
        {
          name: 'a custom placeholder',
          props: { placeholder: 'Reply here' },
          callbacks: ['onSubmit'],
        },
        {
          name: 'leading and trailing nodes',
          props: {
            leading: { $nodes: [{ tag: 'span', attrs: { 'data-lead': '' } }] },
            trailing: { $nodes: [{ tag: 'span', attrs: { 'data-trail': '' } }] },
          },
          callbacks: ['onSubmit'],
        },
        {
          name: 'disabled',
          props: { disabled: true },
          callbacks: ['onSubmit'],
        },
        {
          name: 'typing enables the send button',
          callbacks: ['onSubmit'],
          interactions: [{ type: 'input', selector: 'textarea', value: 'Hello' }],
        },
        {
          name: 'the send button submits and clears the field',
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'input', selector: 'textarea', value: 'Hello' },
            { type: 'click', selector: 'button' },
          ],
        },
        {
          name: 'the submitted value is trimmed',
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'input', selector: 'textarea', value: '  Hello there  ' },
            { type: 'click', selector: 'button' },
          ],
        },
        {
          name: 'a whitespace-only draft cannot be sent',
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'input', selector: 'textarea', value: '   ' },
            { type: 'click', selector: 'button' },
          ],
        },
        {
          name: 'Ctrl+Enter submits',
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'input', selector: 'textarea', value: 'Hello' },
            { type: 'keydown', selector: 'textarea', key: 'Enter', ctrlKey: true },
          ],
        },
        {
          name: 'Cmd+Enter submits',
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'input', selector: 'textarea', value: 'Hello' },
            { type: 'keydown', selector: 'textarea', key: 'Enter', metaKey: true },
          ],
        },
        {
          name: 'plain Enter does not submit',
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'input', selector: 'textarea', value: 'Hello' },
            { type: 'keydown', selector: 'textarea', key: 'Enter' },
          ],
        },
        {
          name: 'submitOnEnter false leaves Ctrl+Enter alone',
          props: { submitOnEnter: false },
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'input', selector: 'textarea', value: 'Hello' },
            { type: 'keydown', selector: 'textarea', key: 'Enter', ctrlKey: true },
          ],
        },
        {
          name: 'className passthrough',
          props: { className: 'parity-token' },
          callbacks: ['onSubmit'],
        },
        {
          name: 'the placeholder changes',
          callbacks: ['onSubmit'],
          interactions: [{ type: 'props', props: { placeholder: 'Say something' } }],
        },
        {
          name: 'the placeholder falls back to the default',
          props: { placeholder: 'Say something' },
          callbacks: ['onSubmit'],
          interactions: [{ type: 'props', props: { placeholder: undefined } }],
        },
      ],
    },
  ],
}
