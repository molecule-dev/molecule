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
  Button: ({ children, disabled }: { children?: ReactNode; disabled?: boolean }) =>
    createElement('button', { 'data-button': '', disabled }, children),
  Card: ({ children, className }: { children?: ReactNode; className?: string }) =>
    createElement('div', { 'data-card': '', className }, children),
}))

const { QuizCard } = await import('../QuizCard.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const options = [
  { id: 'a', label: 'Paris' },
  { id: 'b', label: 'London' },
  { id: 'c', label: 'Berlin' },
]

// The submitted/revealed state requires clicks; SSR covers the initial state.
describe('QuizCard', () => {
  it('renders the question and every option', () => {
    const markup = html(createElement(QuizCard, { question: 'Capital of France?', options }))
    expect(markup).toContain('Capital of France?')
    expect(markup).toContain('Paris')
    expect(markup).toContain('London')
    expect(markup).toContain('Berlin')
  })

  it('renders the progress and timer slots', () => {
    const markup = html(
      createElement(QuizCard, {
        question: 'Q',
        options,
        progress: '2 / 10',
        timer: createElement('span', { 'data-timer': '' }),
      }),
    )
    expect(markup).toContain('2 / 10')
    expect(markup).toContain('data-timer=""')
  })

  it('renders the submit button disabled until an option is selected', () => {
    const markup = html(createElement(QuizCard, { question: 'Q', options }))
    expect(markup).toContain('Submit answer')
    expect(markup).toMatch(/<button[^>]*data-button=""[^>]*disabled/)
  })

  it('renders one option button per option', () => {
    const markup = html(createElement(QuizCard, { question: 'Q', options }))
    // 3 option buttons + 1 submit button
    expect(markup.match(/<button/g) ?? []).toHaveLength(4)
  })

  it('does not reveal the explanation before submit', () => {
    const markup = html(
      createElement(QuizCard, { question: 'Q', options, explanation: 'Paris is the capital.' }),
    )
    expect(markup).not.toContain('Paris is the capital.')
  })

  it('forwards className onto the Card', () => {
    const markup = html(createElement(QuizCard, { question: 'Q', options, className: 'qc-cls' }))
    expect(markup).toContain('qc-cls')
  })
})
