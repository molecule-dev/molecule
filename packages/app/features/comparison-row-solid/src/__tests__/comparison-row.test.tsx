// @vitest-environment jsdom
/**
 * Unit tests for the Solid `ComparisonRow` — a port of
 * `@molecule/app-comparison-row-react/src/__tests__/comparison-row.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted
 * on the markup the component produces. The delta's tone is a ClassMap class,
 * so the assertions check which `textTone-<tone>` class the row picked (the
 * same mock the React tests use).
 *
 * @module
 */

import { render } from 'solid-js/web'
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
        // Tone resolvers echo their argument, so assertions can tell which
        // semantic tone (`textTone-success`) the row picked.
        return (...args: unknown[]) => (args.length > 0 ? `${token}-${String(args[0])}` : token)
      },
    }
    return new Proxy({}, handler)
  },
}))

import type { JSX } from 'solid-js'

const { ComparisonRow } = await import('../ComparisonRow.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('ComparisonRow', () => {
  it('renders the label and current value', () => {
    const container = mount(() => <ComparisonRow label="Revenue" current="$12,345" />)
    const markup = container.innerHTML
    expect(markup).toContain('Revenue')
    expect(markup).toContain('$12,345')
  })

  it('renders the previous value (struck through) when present and omits it otherwise', () => {
    const withPrev = mount(() => <ComparisonRow label="R" current="$100" previous="$80" />)
    expect(withPrev.innerHTML).toContain('$80')
    expect(withPrev.innerHTML).toContain('line-through')
    const without = mount(() => <ComparisonRow label="R" current="$100" />)
    expect(without.innerHTML).not.toContain('line-through')
  })

  it('renders an up arrow + percentage for a positive delta', () => {
    const container = mount(() => <ComparisonRow label="R" current="$1" deltaPct={12.5} />)
    const markup = container.innerHTML
    expect(markup).toContain('▲')
    expect(markup).toContain('12.5%')
    expect(markup).toContain('textTone-success')
    expect(markup).not.toContain('style=')
  })

  it('renders a down arrow for a negative delta', () => {
    const container = mount(() => <ComparisonRow label="R" current="$1" deltaPct={-8} />)
    const markup = container.innerHTML
    expect(markup).toContain('▼')
    expect(markup).toContain('8.0%')
    expect(markup).toContain('textTone-error')
  })

  it('renders the neutral dash for a zero delta', () => {
    const container = mount(() => <ComparisonRow label="R" current="$1" deltaPct={0} />)
    expect(container.innerHTML).toContain('–')
    expect(container.innerHTML).toContain('textTone-secondary')
  })

  it('uses a custom formatDelta when supplied', () => {
    const container = mount(() => (
      <ComparisonRow
        label="R"
        current="$1"
        deltaPct={5}
        formatDelta={(d) => <span data-fmt>{`delta ${d}`}</span>}
      />
    ))
    const markup = container.innerHTML
    expect(markup).toContain('data-fmt')
    expect(markup).toContain('delta 5')
  })

  it('renders the periodLabel and forwards className', () => {
    const container = mount(() => (
      <ComparisonRow label="R" current="$1" periodLabel="vs. last week" className="cr-cls" />
    ))
    const markup = container.innerHTML
    expect(markup).toContain('vs. last week')
    expect(markup).toContain('cr-cls')
  })
})
