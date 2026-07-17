import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    // Mirror the real provider: return the defaultValue and interpolate any
    // `{{name}}` placeholders from `values` (so `{{count}}` resolves like it
    // does at runtime).
    t: (
      key: string,
      values?: Record<string, unknown>,
      opts?: { defaultValue?: string },
    ): string => {
      const template = opts?.defaultValue ?? key
      return template.replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
        values && name in values ? String(values[name]) : `{{${name}}}`,
      )
    },
  }),
}))

const { EmojiReactions } = await import('../EmojiReactions.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const reactions = [
  { emoji: '👍', count: 3 },
  { emoji: '❤️', count: 1, reactedByMe: true },
]

describe('EmojiReactions', () => {
  it('renders a chip per reaction with emoji and count', () => {
    const markup = html(createElement(EmojiReactions, { reactions }))
    expect(markup).toContain('👍')
    expect(markup).toContain('3')
    expect(markup).toContain('❤️')
  })

  it('marks chips the current user reacted to as aria-pressed', () => {
    const markup = html(createElement(EmojiReactions, { reactions }))
    expect(markup).toContain('aria-pressed="true"')
  })

  it('puts a data-mol-id on every reaction chip button', () => {
    const markup = html(createElement(EmojiReactions, { reactions }))
    const count = (markup.match(/data-mol-id="emoji-reaction"/g) ?? []).length
    expect(count).toBe(reactions.length)
  })

  it('puts a data-mol-id on the add and quick-pick buttons', () => {
    const markup = html(
      createElement(EmojiReactions, { reactions, onAdd: () => {}, quickPicks: ['🚀'] }),
    )
    expect(markup).toContain('data-mol-id="emoji-reaction-add"')
    // Picker is closed on first render (SSR), so picks aren't in the markup yet.
    expect(markup).not.toContain('data-mol-id="emoji-reaction-pick"')
  })

  it('shows the default "<count> reactions" title when no renderTooltip is given', () => {
    const markup = html(createElement(EmojiReactions, { reactions }))
    // The default title routes through t() with an English fallback.
    expect(markup).toContain('title="3 reactions"')
  })

  it('renders renderTooltip content in the output and suppresses the default title', () => {
    const markup = html(
      createElement(EmojiReactions, {
        reactions,
        renderTooltip: (r) => createElement('span', { 'data-tip': '' }, `who: ${r.count}`),
      }),
    )
    // The tooltip node and its content are actually in the rendered output.
    expect(markup).toContain('role="tooltip"')
    expect(markup).toContain('data-tip=""')
    expect(markup).toContain('who: 3')
    // The chip is linked to its tooltip for accessibility.
    expect(markup).toContain('aria-describedby="emoji-reaction-tip-👍"')
    // The default native title is suppressed when a rich tooltip is present.
    expect(markup).not.toContain('title="3 reactions"')
  })

  it('keeps the default title for chips whose renderTooltip returns nullish', () => {
    const markup = html(
      createElement(EmojiReactions, {
        reactions,
        // Only the ❤️ chip gets a custom tooltip; 👍 falls back to the title.
        renderTooltip: (r) => (r.emoji === '❤️' ? createElement('span', {}, 'liked') : null),
      }),
    )
    expect(markup).toContain('title="3 reactions"')
    expect(markup).toContain('liked')
  })

  it('renders the add button only when onAdd is supplied', () => {
    const withAdd = html(createElement(EmojiReactions, { reactions, onAdd: () => {} }))
    expect(withAdd).toContain('aria-label="Add reaction"')
    const without = html(createElement(EmojiReactions, { reactions }))
    expect(without).not.toContain('aria-label="Add reaction"')
  })

  it('keeps the quick-pick picker closed until the add button is clicked', () => {
    // The picker only opens on a click — not reachable via SSR.
    const markup = html(
      createElement(EmojiReactions, { reactions: [], onAdd: () => {}, quickPicks: ['🚀'] }),
    )
    expect(markup).not.toContain('🚀')
  })

  it('forwards className', () => {
    const markup = html(createElement(EmojiReactions, { reactions, className: 'er-cls' }))
    expect(markup).toContain('er-cls')
  })
})
