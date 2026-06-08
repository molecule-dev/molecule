import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: every access yields its key as a token — callable
// for method-style props (`cm.stack(4)`) and also usable bare (`cm.shrink0`).
// `cn(...)` joins tokens, calling any function-valued args first.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// `t(key, values, opts)` echoes the supplied `defaultValue`.
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Avatar: ({ src, name }: { src?: string; name?: string }) =>
    createElement('img', { 'data-avatar': src ?? '', 'data-avatar-name': name ?? '' }),
  Button: ({ children, disabled }: { children?: ReactNode; disabled?: boolean }) =>
    createElement('button', { 'data-button': '', disabled }, children),
  Textarea: ({ placeholder, disabled }: { placeholder?: string; disabled?: boolean }) =>
    createElement('textarea', { 'data-textarea': '', placeholder, disabled }),
}))

const { MessageAttachments } = await import('../MessageAttachments.js')
const { MessageBubble } = await import('../MessageBubble.js')
const { MessageComposer } = await import('../MessageComposer.js')
const { MessageList } = await import('../MessageList.js')
const { MessageMeta } = await import('../MessageMeta.js')
const { MessageReactions } = await import('../MessageReactions.js')
const { ThreadIndicator } = await import('../ThreadIndicator.js')
import type { MessageData } from '../types.js'

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const msg = (id: string, over: Partial<MessageData> = {}): MessageData => ({
  id,
  author: { id: `u-${id}`, name: `name-${id}` },
  body: `body-${id}`,
  timestamp: `ts-${id}`,
  ...over,
})

describe('MessageMeta', () => {
  it('renders the author and timestamp', () => {
    const markup = html(createElement(MessageMeta, { author: 'Alice', timestamp: '10:30' }))
    expect(markup).toContain('Alice')
    expect(markup).toContain('10:30')
  })

  it('forwards className', () => {
    const markup = html(
      createElement(MessageMeta, { author: 'A', timestamp: 't', className: 'meta-cls' }),
    )
    expect(markup).toContain('meta-cls')
  })
})

describe('MessageAttachments', () => {
  const att = (id: string, over = {}): { id: string; name: string } => ({
    id,
    name: `file-${id}`,
    ...over,
  })

  it('renders every attachment name', () => {
    const markup = html(createElement(MessageAttachments, { attachments: [att('a'), att('b')] }))
    expect(markup).toContain('file-a')
    expect(markup).toContain('file-b')
  })

  it('renders the size label when present and omits it otherwise', () => {
    const withSize = html(
      createElement(MessageAttachments, { attachments: [att('a', { size: '2.3 MB' })] }),
    )
    expect(withSize).toContain('2.3 MB')
    const without = html(createElement(MessageAttachments, { attachments: [att('a')] }))
    expect(without).not.toContain('MB')
  })

  it('renders the icon and action slots', () => {
    const markup = html(
      createElement(MessageAttachments, {
        attachments: [
          att('a', {
            icon: createElement('i', { 'data-icon': '' }),
            action: createElement('button', { 'data-action': '' }),
          }),
        ],
      }),
    )
    expect(markup).toContain('data-icon=""')
    expect(markup).toContain('data-action=""')
  })

  it('forwards className', () => {
    const markup = html(
      createElement(MessageAttachments, { attachments: [], className: 'att-cls' }),
    )
    expect(markup).toContain('att-cls')
  })
})

describe('MessageReactions', () => {
  it('renders every reaction emoji and count', () => {
    const markup = html(
      createElement(MessageReactions, {
        reactions: [
          { emoji: '👍', count: 3 },
          { emoji: '🎉', count: 1 },
        ],
      }),
    )
    expect(markup).toContain('👍')
    expect(markup).toContain('3')
    expect(markup).toContain('🎉')
  })

  it('sets aria-pressed on chips the current user reacted to', () => {
    const markup = html(
      createElement(MessageReactions, {
        reactions: [{ emoji: '👍', count: 1, reactedByMe: true }],
      }),
    )
    expect(markup).toContain('aria-pressed="true"')
  })

  it('renders the "+" add button only when onAdd is supplied', () => {
    const withAdd = html(createElement(MessageReactions, { reactions: [], onAdd: () => {} }))
    expect(withAdd).toContain('+')
    const without = html(createElement(MessageReactions, { reactions: [] }))
    expect(without).not.toContain('+')
  })

  it('forwards className', () => {
    const markup = html(createElement(MessageReactions, { reactions: [], className: 'rx-cls' }))
    expect(markup).toContain('rx-cls')
  })
})

describe('ThreadIndicator', () => {
  it('renders the singular "1 reply" label for replyCount 1', () => {
    const markup = html(createElement(ThreadIndicator, { replyCount: 1 }))
    expect(markup).toContain('1 reply')
    expect(markup).not.toContain('1 replies')
  })

  it('renders the plural "N replies" label for replyCount > 1', () => {
    const markup = html(createElement(ThreadIndicator, { replyCount: 4 }))
    expect(markup).toContain('4 replies')
  })

  it('renders lastReplyAt when present and omits it otherwise', () => {
    const withTime = html(
      createElement(ThreadIndicator, { replyCount: 2, lastReplyAt: 'last Monday' }),
    )
    expect(withTime).toContain('last Monday')
    const without = html(createElement(ThreadIndicator, { replyCount: 2 }))
    expect(without).not.toContain('·')
  })

  it('forwards className', () => {
    const markup = html(createElement(ThreadIndicator, { replyCount: 1, className: 'thr-cls' }))
    expect(markup).toContain('thr-cls')
  })
})

describe('MessageBubble', () => {
  it('renders the author name and body', () => {
    const markup = html(createElement(MessageBubble, { message: msg('a') }))
    expect(markup).toContain('name-a')
    expect(markup).toContain('body-a')
  })

  it('renders the meta row by default and hides it when showMeta is false', () => {
    const shown = html(createElement(MessageBubble, { message: msg('a') }))
    expect(shown).toContain('ts-a')
    const hidden = html(createElement(MessageBubble, { message: msg('a'), showMeta: false }))
    expect(hidden).not.toContain('ts-a')
  })

  it('renders the author Avatar', () => {
    const markup = html(createElement(MessageBubble, { message: msg('a') }))
    expect(markup).toContain('data-avatar-name="name-a"')
  })

  it('renders attachments, reactions, and thread nodes when present on the message', () => {
    const markup = html(
      createElement(MessageBubble, {
        message: msg('a', {
          attachments: createElement('div', { 'data-att': '' }),
          reactions: createElement('div', { 'data-rx': '' }),
          thread: createElement('div', { 'data-thr': '' }),
        }),
      }),
    )
    expect(markup).toContain('data-att=""')
    expect(markup).toContain('data-rx=""')
    expect(markup).toContain('data-thr=""')
  })

  it('forwards className', () => {
    const markup = html(createElement(MessageBubble, { message: msg('a'), className: 'bub-cls' }))
    expect(markup).toContain('bub-cls')
  })
})

describe('MessageList', () => {
  it('renders one bubble per message', () => {
    const markup = html(createElement(MessageList, { messages: [msg('a'), msg('b'), msg('c')] }))
    expect(markup).toContain('body-a')
    expect(markup).toContain('body-b')
    expect(markup).toContain('body-c')
  })

  it('renders the emptyState when messages is empty and emptyState is given', () => {
    const markup = html(
      createElement(MessageList, {
        messages: [],
        emptyState: createElement('p', { 'data-empty': '' }, 'No messages'),
      }),
    )
    expect(markup).toContain('data-empty=""')
    expect(markup).toContain('No messages')
  })

  it('renders an empty wrapper when messages is empty and no emptyState is given', () => {
    const markup = html(createElement(MessageList, { messages: [] }))
    expect(markup).not.toContain('body-')
  })

  it('invokes renderDateSeparator with each message and its index', () => {
    const seen: Array<[string, number]> = []
    const markup = html(
      createElement(MessageList, {
        messages: [msg('a'), msg('b')],
        renderDateSeparator: (m, i) => {
          seen.push([m.id, i])
          return createElement('hr', { 'data-sep': m.id })
        },
      }),
    )
    expect(seen).toEqual([
      ['a', 0],
      ['b', 1],
    ])
    expect(markup).toContain('data-sep="a"')
    expect(markup).toContain('data-sep="b"')
  })

  it('forwards className', () => {
    const markup = html(createElement(MessageList, { messages: [msg('a')], className: 'list-cls' }))
    expect(markup).toContain('list-cls')
  })
})

describe('MessageComposer', () => {
  it('renders the default placeholder', () => {
    const markup = html(createElement(MessageComposer, { onSubmit: () => {} }))
    expect(markup).toContain('Write a message')
  })

  it('renders a custom placeholder over the default', () => {
    const markup = html(
      createElement(MessageComposer, { onSubmit: () => {}, placeholder: 'Reply here' }),
    )
    expect(markup).toContain('Reply here')
    expect(markup).not.toContain('Write a message')
  })

  it('renders the Send button disabled while the input is empty', () => {
    const markup = html(createElement(MessageComposer, { onSubmit: () => {} }))
    expect(markup).toContain('Send')
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('renders the leading and trailing slots', () => {
    const markup = html(
      createElement(MessageComposer, {
        onSubmit: () => {},
        leading: createElement('span', { 'data-lead': '' }),
        trailing: createElement('span', { 'data-trail': '' }),
      }),
    )
    expect(markup).toContain('data-lead=""')
    expect(markup).toContain('data-trail=""')
  })

  it('disables the textarea when disabled is set', () => {
    const markup = html(createElement(MessageComposer, { onSubmit: () => {}, disabled: true }))
    expect(markup).toMatch(/<textarea[^>]*disabled/)
  })

  it('forwards className', () => {
    const markup = html(
      createElement(MessageComposer, { onSubmit: () => {}, className: 'comp-cls' }),
    )
    expect(markup).toContain('comp-cls')
  })
})
