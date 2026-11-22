// @vitest-environment jsdom
/**
 * Unit tests for the Solid `FlashcardCard` — a port of
 * `@molecule/app-flashcard-card-react/src/__tests__/flashcard-card.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
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

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: { children?: JSX.Element }) => <button data-button="">{props.children}</button>,
  Card: (props: { children?: JSX.Element; className?: string }) => (
    <div data-card="" class={props.className}>
      {props.children}
    </div>
  ),
}))

const { FlashcardCard } = await import('../FlashcardCard.jsx')

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

describe('FlashcardCard', () => {
  it('shows the front and a "Show answer" button before reveal', () => {
    const markup = mount(() => <FlashcardCard front="Q: 2+2?" back="A: 4" />).innerHTML
    expect(markup).toContain('Q: 2+2?')
    expect(markup).toContain('Show answer')
    expect(markup).not.toContain('A: 4')
  })

  it('shows the back and the grade buttons when defaultRevealed is set', () => {
    const markup = mount(() => (
      <FlashcardCard front="Q" back="A: 4" defaultRevealed={true} />
    )).innerHTML
    expect(markup).toContain('A: 4')
    expect(markup).toContain('Again')
    expect(markup).toContain('Hard')
    expect(markup).toContain('Good')
    expect(markup).toContain('Easy')
  })

  it('renders the progress slot', () => {
    const markup = mount(() => (
      <FlashcardCard front="Q" back="A" progress={<span data-progress="" />} />
    )).innerHTML
    expect(markup).toContain('data-progress=""')
  })

  it('forwards className onto the Card', () => {
    const markup = mount(() => <FlashcardCard front="Q" back="A" className="fc-cls" />).innerHTML
    expect(markup).toContain('fc-cls')
  })
})
