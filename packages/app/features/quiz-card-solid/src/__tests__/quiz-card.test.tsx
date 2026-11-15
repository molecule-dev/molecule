// @vitest-environment jsdom
/**
 * Unit tests for the Solid `QuizCard` — a port of
 * `@molecule/app-quiz-card-react/src/__tests__/quiz-card.test.tsx`: the same
 * behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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

vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: { children?: JSX.Element; disabled?: boolean; onClick?: () => void }) => (
    <button data-button="" disabled={props.disabled} onClick={props.onClick}>
      {props.children}
    </button>
  ),
  Card: (props: { children?: JSX.Element; className?: string }) => (
    <div data-card="" class={props.className}>
      {props.children}
    </div>
  ),
}))

const { QuizCard } = await import('../QuizCard.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Renders a view with Solid's browser renderer and returns the wrapper element.
 *
 * @param view - The view to render.
 * @returns The wrapper element.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

const options = [
  { id: 'a', label: 'Paris' },
  { id: 'b', label: 'London' },
  { id: 'c', label: 'Berlin' },
]

describe('QuizCard', () => {
  it('renders the question and every option', () => {
    const markup = mount(() => (
      <QuizCard question="Capital of France?" options={options} />
    )).innerHTML
    expect(markup).toContain('Capital of France?')
    expect(markup).toContain('Paris')
    expect(markup).toContain('London')
    expect(markup).toContain('Berlin')
  })

  it('renders the progress and timer slots', () => {
    const markup = mount(() => (
      <QuizCard question="Q" options={options} progress="2 / 10" timer={<span data-timer="" />} />
    )).innerHTML
    expect(markup).toContain('2 / 10')
    expect(markup).toContain('data-timer=""')
  })

  it('renders the submit button disabled until an option is selected', () => {
    const markup = mount(() => <QuizCard question="Q" options={options} />).innerHTML
    expect(markup).toContain('Submit answer')
    expect(markup).toMatch(/<button[^>]*data-button=""[^>]*disabled/)
  })

  it('renders one option button per option', () => {
    const markup = mount(() => <QuizCard question="Q" options={options} />).innerHTML
    // 3 option buttons + 1 submit button
    expect(markup.match(/<button/g) ?? []).toHaveLength(4)
  })

  it('does not reveal the explanation before submit', () => {
    const markup = mount(() => (
      <QuizCard question="Q" options={options} explanation="Paris is the capital." />
    )).innerHTML
    expect(markup).not.toContain('Paris is the capital.')
  })

  it('forwards className onto the Card', () => {
    const markup = mount(() => (
      <QuizCard question="Q" options={options} className="qc-cls" />
    )).innerHTML
    expect(markup).toContain('qc-cls')
  })
})
