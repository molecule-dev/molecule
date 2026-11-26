// @vitest-environment jsdom
/**
 * Unit tests for the Svelte message/chat primitives — a port of
 * `@molecule/app-message-bubble-react/src/__tests__/message-bubble.test.tsx`:
 * the same behavioral assertions, rendered with Svelte 5 in jsdom and asserted
 * on the markup the components produce.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

// `t(key, values, opts)` echoes the supplied `defaultValue` with `{{name}}`
// placeholders filled from `values` — the same echo the React suite uses — and
// stays a spy, so a test can read the options a component passed.
const { t } = vi.hoisted(() => ({
  t: vi.fn((key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
    const text = opts?.defaultValue ?? key
    return text.replace(/\{\{(\w+)\}\}/g, (whole, field: string) =>
      values && field in values ? String(values[field]) : whole,
    )
  }),
}))
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t }),
}))

// The three `@molecule/app-ui-svelte` components the package renders, stubbed to
// inspectable native elements — the same markers the React suite's stubs emit.
vi.mock('@molecule/app-ui-svelte', async (importOriginal) => {
  const { default: Avatar } = await import('./stubs/AvatarStub.svelte')
  const { default: Button } = await import('./stubs/ButtonStub.svelte')
  const { default: Textarea } = await import('./stubs/TextareaStub.svelte')
  return { ...(await importOriginal<Record<string, unknown>>()), Avatar, Button, Textarea }
})

const { MessageAttachments, MessageBubble, MessageComposer, MessageList, MessageMeta } =
  await import('../components.js')
const { MessageReactions, ThreadIndicator } = await import('../components.js')
import type { MessageData } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (markup: string): Snippet => createRawSnippet(() => ({ render: () => markup }))

/** Renders one component and returns the markup it produced. */
const html = (component: unknown, props: Record<string, unknown> = {}): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const mounted = mount(component as never, { target, props })
  flushSync()
  const markup = target.innerHTML
  void unmount(mounted)
  target.remove()
  return markup
}

const msg = (id: string, over: Partial<MessageData> = {}): MessageData => ({
  id,
  author: { id: `u-${id}`, name: `name-${id}` },
  body: `body-${id}`,
  timestamp: `ts-${id}`,
  ...over,
})

describe('MessageMeta', () => {
  it('renders the author and timestamp', () => {
    const markup = html(MessageMeta, { author: 'Alice', timestamp: '10:30' })
    expect(markup).toContain('Alice')
    expect(markup).toContain('10:30')
  })

  it('forwards className', () => {
    const markup = html(MessageMeta, { author: 'A', timestamp: 't', className: 'meta-cls' })
    expect(markup).toContain('meta-cls')
  })
})

describe('MessageAttachments', () => {
  const att = (id: string, over: Record<string, unknown> = {}): { id: string; name: string } => ({
    id,
    name: `file-${id}`,
    ...over,
  })

  it('renders every attachment name', () => {
    const markup = html(MessageAttachments, { attachments: [att('a'), att('b')] })
    expect(markup).toContain('file-a')
    expect(markup).toContain('file-b')
  })

  it('renders the size label when present and omits it otherwise', () => {
    const withSize = html(MessageAttachments, { attachments: [att('a', { size: '2.3 MB' })] })
    expect(withSize).toContain('2.3 MB')
    const without = html(MessageAttachments, { attachments: [att('a')] })
    expect(without).not.toContain('MB')
  })

  it('renders the icon and action slots', () => {
    const markup = html(MessageAttachments, {
      attachments: [
        att('a', { icon: raw('<i data-icon></i>'), action: raw('<button data-action></button>') }),
      ],
    })
    expect(markup).toContain('data-icon=""')
    expect(markup).toContain('data-action=""')
  })

  it('forwards className', () => {
    const markup = html(MessageAttachments, { attachments: [], className: 'att-cls' })
    expect(markup).toContain('att-cls')
  })
})

describe('MessageReactions', () => {
  it('renders every reaction emoji and count', () => {
    const markup = html(MessageReactions, {
      reactions: [
        { emoji: '👍', count: 3 },
        { emoji: '🎉', count: 1 },
      ],
    })
    expect(markup).toContain('👍')
    expect(markup).toContain('3')
    expect(markup).toContain('🎉')
  })

  it('sets aria-pressed on chips the current user reacted to', () => {
    const markup = html(MessageReactions, {
      reactions: [{ emoji: '👍', count: 1, reactedByMe: true }],
    })
    expect(markup).toContain('aria-pressed="true"')
  })

  it('renders the "+" add button only when onAdd is supplied', () => {
    const withAdd = html(MessageReactions, { reactions: [], onAdd: () => {} })
    expect(withAdd).toContain('+')
    const without = html(MessageReactions, { reactions: [] })
    expect(without).not.toContain('+')
  })

  it('forwards className', () => {
    const markup = html(MessageReactions, { reactions: [], className: 'rx-cls' })
    expect(markup).toContain('rx-cls')
  })
})

describe('ThreadIndicator', () => {
  it('renders the interpolated count fallback for replyCount 1 (the loaded bond picks "1 reply" via thread.replies_one)', () => {
    const markup = html(ThreadIndicator, { replyCount: 1 })
    expect(markup).toContain('1 replies')
    expect(markup).not.toContain('{{count}}')
  })

  it('renders the plural "N replies" label for replyCount > 1', () => {
    const markup = html(ThreadIndicator, { replyCount: 4 })
    expect(markup).toContain('4 replies')
  })

  it('passes replyCount as the plural count, so the locale bond picks thread.replies_one/_other', () => {
    html(ThreadIndicator, { replyCount: 3 })
    expect(t).toHaveBeenCalledWith(
      'thread.replies',
      { count: 3 },
      expect.objectContaining({ count: 3 }),
    )
  })

  it('renders lastReplyAt when present and omits it otherwise', () => {
    const withTime = html(ThreadIndicator, { replyCount: 2, lastReplyAt: 'last Monday' })
    expect(withTime).toContain('last Monday')
    const without = html(ThreadIndicator, { replyCount: 2 })
    expect(without).not.toContain('·')
  })

  it('forwards className', () => {
    const markup = html(ThreadIndicator, { replyCount: 1, className: 'thr-cls' })
    expect(markup).toContain('thr-cls')
  })
})

describe('MessageBubble', () => {
  it('renders the author name and body', () => {
    const markup = html(MessageBubble, { message: msg('a') })
    expect(markup).toContain('name-a')
    expect(markup).toContain('body-a')
  })

  it('renders the meta row by default and hides it when showMeta is false', () => {
    const shown = html(MessageBubble, { message: msg('a') })
    expect(shown).toContain('ts-a')
    const hidden = html(MessageBubble, { message: msg('a'), showMeta: false })
    expect(hidden).not.toContain('ts-a')
  })

  it('renders the author Avatar', () => {
    const markup = html(MessageBubble, { message: msg('a') })
    expect(markup).toContain('data-avatar-name="name-a"')
  })

  it('renders attachments, reactions, and thread nodes when present on the message', () => {
    const markup = html(MessageBubble, {
      message: msg('a', {
        attachments: raw('<div data-att></div>'),
        reactions: raw('<div data-rx></div>'),
        thread: raw('<div data-thr></div>'),
      }),
    })
    expect(markup).toContain('data-att=""')
    expect(markup).toContain('data-rx=""')
    expect(markup).toContain('data-thr=""')
  })

  it('forwards className', () => {
    const markup = html(MessageBubble, { message: msg('a'), className: 'bub-cls' })
    expect(markup).toContain('bub-cls')
  })
})

describe('MessageList', () => {
  it('renders one bubble per message', () => {
    const markup = html(MessageList, { messages: [msg('a'), msg('b'), msg('c')] })
    expect(markup).toContain('body-a')
    expect(markup).toContain('body-b')
    expect(markup).toContain('body-c')
  })

  it('renders the emptyState when messages is empty and emptyState is given', () => {
    const markup = html(MessageList, {
      messages: [],
      emptyState: raw('<p data-empty="">No messages</p>'),
    })
    expect(markup).toContain('data-empty=""')
    expect(markup).toContain('No messages')
  })

  it('renders an empty wrapper when messages is empty and no emptyState is given', () => {
    const markup = html(MessageList, { messages: [] })
    expect(markup).not.toContain('body-')
  })

  it('invokes renderDateSeparator with each message and its index', () => {
    const seen: Array<[string, number]> = []
    const markup = html(MessageList, {
      messages: [msg('a'), msg('b')],
      renderDateSeparator: createRawSnippet((m: () => MessageData, i: () => number) => {
        seen.push([m().id, i()])
        return { render: () => `<hr data-sep="${m().id}">` }
      }),
    })
    expect(seen).toEqual([
      ['a', 0],
      ['b', 1],
    ])
    expect(markup).toContain('data-sep="a"')
    expect(markup).toContain('data-sep="b"')
  })

  it('forwards className', () => {
    const markup = html(MessageList, { messages: [msg('a')], className: 'list-cls' })
    expect(markup).toContain('list-cls')
  })
})

describe('MessageComposer', () => {
  it('renders the default placeholder', () => {
    const markup = html(MessageComposer, { onSubmit: () => {} })
    expect(markup).toContain('Write a message')
  })

  it('renders a custom placeholder over the default', () => {
    const markup = html(MessageComposer, { onSubmit: () => {}, placeholder: 'Reply here' })
    expect(markup).toContain('Reply here')
    expect(markup).not.toContain('Write a message')
  })

  it('renders the Send button disabled while the input is empty', () => {
    const markup = html(MessageComposer, { onSubmit: () => {} })
    expect(markup).toContain('Send')
    expect(markup).toMatch(/<button[^>]*data-button[^>]*disabled/)
  })

  it('renders the leading and trailing slots', () => {
    const markup = html(MessageComposer, {
      onSubmit: () => {},
      leading: raw('<span data-lead></span>'),
      trailing: raw('<span data-trail></span>'),
    })
    expect(markup).toContain('data-lead=""')
    expect(markup).toContain('data-trail=""')
  })

  it('disables the textarea when disabled is set', () => {
    const markup = html(MessageComposer, { onSubmit: () => {}, disabled: true })
    expect(markup).toMatch(/<textarea[^>]*disabled/)
  })

  it('forwards className', () => {
    const markup = html(MessageComposer, { onSubmit: () => {}, className: 'comp-cls' })
    expect(markup).toContain('comp-cls')
  })
})
