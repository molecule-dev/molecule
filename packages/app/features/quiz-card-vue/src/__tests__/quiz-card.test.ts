// @vitest-environment jsdom
/**
 * Unit tests for the Vue `QuizCard` — a port of
 * `@molecule/app-quiz-card-react/src/__tests__/quiz-card.test.tsx`: the same
 * behavioral assertions, rendered with Vue in jsdom and asserted on the markup
 * the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({
      name: 'Button',
      props: { variant: String, color: String, onClick: Function, disabled: Boolean },
      setup(props, { slots }) {
        return () => h('button', { 'data-button': '', disabled: props.disabled }, slots.default?.())
      },
    }),
    Card: defineComponent({
      name: 'Card',
      props: { className: String },
      setup(props, { slots }) {
        return () => h('div', { 'data-card': '', class: props.className }, slots.default?.())
      },
    }),
  }
})

import { createApp, defineComponent, h } from 'vue'

import { QuizCard } from '../QuizCard.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Mounts a {@link QuizCard} with the given props and returns the markup it
 * produced.
 *
 * @param props - The card's props.
 * @returns The markup.
 */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(QuizCard, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const options = [
  { id: 'a', label: 'Paris' },
  { id: 'b', label: 'London' },
  { id: 'c', label: 'Berlin' },
]

describe('QuizCard', () => {
  it('renders the question and every option', () => {
    const markup = render({ question: 'Capital of France?', options })
    expect(markup).toContain('Capital of France?')
    expect(markup).toContain('Paris')
    expect(markup).toContain('London')
    expect(markup).toContain('Berlin')
  })

  it('renders the progress and timer slots', () => {
    const markup = render({
      question: 'Q',
      options,
      progress: '2 / 10',
      timer: h('span', { 'data-timer': '' }),
    })
    expect(markup).toContain('2 / 10')
    expect(markup).toContain('data-timer=""')
  })

  it('renders the submit button disabled until an option is selected', () => {
    const markup = render({ question: 'Q', options })
    expect(markup).toContain('Submit answer')
    expect(markup).toMatch(/<button[^>]*data-button=""[^>]*disabled/)
  })

  it('renders one option button per option', () => {
    const markup = render({ question: 'Q', options })
    // 3 option buttons + 1 submit button
    expect(markup.match(/<button/g) ?? []).toHaveLength(4)
  })

  it('does not reveal the explanation before submit', () => {
    const markup = render({
      question: 'Q',
      options,
      explanation: 'Paris is the capital.',
    })
    expect(markup).not.toContain('Paris is the capital.')
  })

  it('forwards className onto the Card', () => {
    const markup = render({ question: 'Q', options, className: 'qc-cls' })
    expect(markup).toContain('qc-cls')
  })
})
