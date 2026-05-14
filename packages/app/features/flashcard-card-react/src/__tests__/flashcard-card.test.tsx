import { createElement } from 'react'
import type { ReactNode } from 'react'
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

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children }: { children?: ReactNode }) =>
    createElement('button', { 'data-button': '' }, children),
  Card: ({ children, className }: { children?: ReactNode; className?: string }) =>
    createElement('div', { 'data-card': '', className }, children),
}))

const { FlashcardCard } = await import('../FlashcardCard.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('FlashcardCard', () => {
  it('shows the front and a "Show answer" button before reveal', () => {
    const markup = html(createElement(FlashcardCard, { front: 'Q: 2+2?', back: 'A: 4' }))
    expect(markup).toContain('Q: 2+2?')
    expect(markup).toContain('Show answer')
    expect(markup).not.toContain('A: 4')
  })

  it('shows the back and the grade buttons when defaultRevealed is set', () => {
    const markup = html(
      createElement(FlashcardCard, { front: 'Q', back: 'A: 4', defaultRevealed: true }),
    )
    expect(markup).toContain('A: 4')
    expect(markup).toContain('Again')
    expect(markup).toContain('Hard')
    expect(markup).toContain('Good')
    expect(markup).toContain('Easy')
  })

  it('renders the progress slot', () => {
    const markup = html(
      createElement(FlashcardCard, {
        front: 'Q',
        back: 'A',
        progress: createElement('span', { 'data-progress': '' }),
      }),
    )
    expect(markup).toContain('data-progress=""')
  })

  it('forwards className onto the Card', () => {
    const markup = html(
      createElement(FlashcardCard, { front: 'Q', back: 'A', className: 'fc-cls' }),
    )
    expect(markup).toContain('fc-cls')
  })
})
