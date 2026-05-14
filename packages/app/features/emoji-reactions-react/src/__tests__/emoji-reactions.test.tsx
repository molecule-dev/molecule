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
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { EmojiReactions } = await import('../EmojiReactions.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

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
