// @vitest-environment jsdom
/**
 * Unit tests for the Solid `DiffViewer` — a port of
 * `@molecule/app-diff-viewer-react/src/__tests__/diff-viewer.test.tsx`: the
 * same behavioral assertions, rendered with Solid in jsdom and asserted on the
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

const { DiffViewer } = await import('../DiffViewer.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Renders with Solid's browser renderer and disposes after the test. */
const renderMarkup = (view: () => JSX.Element): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container.innerHTML
}

const before = 'line one\nline two\nline three'
const after = 'line one\nline TWO\nline three'

describe('DiffViewer', () => {
  it('renders all lines from before and after', () => {
    const markup = renderMarkup(() => <DiffViewer before={before} after={after} />)
    expect(markup).toContain('line one')
    expect(markup).toContain('line two')
    expect(markup).toContain('line TWO')
    expect(markup).toContain('line three')
  })

  it('marks removed lines with "-" and added lines with "+"', () => {
    const markup = renderMarkup(() => <DiffViewer before={before} after={after} />)
    expect(markup).toContain('-')
    expect(markup).toContain('+')
  })

  it('highlights add/remove rows with the appropriate background color', () => {
    const markup = renderMarkup(() => <DiffViewer before={before} after={after} />)
    expect(markup).toContain('rgba(34, 197, 94, 0.15)')
    expect(markup).toContain('rgba(239, 68, 68, 0.15)')
  })

  it('renders the filename header when present and omits it otherwise', () => {
    expect(
      renderMarkup(() => <DiffViewer before={before} after={after} filename="app.ts" />),
    ).toContain('app.ts')
    expect(renderMarkup(() => <DiffViewer before={before} after={after} />)).not.toContain(
      '<header',
    )
  })

  it('renders line numbers by default and omits them when showLineNumbers is false', () => {
    // Solid serializes the style attribute through cssText (`width:36px`),
    // where React's SSR output is `width:36px` and jsdom's per-property writes
    // are `width: 36px` — the declaration is the same.
    const withNums = renderMarkup(() => <DiffViewer before={before} after={after} />)
    expect(withNums).toMatch(/width:\s*36px/)
    const without = renderMarkup(() => (
      <DiffViewer before={before} after={after} showLineNumbers={false} />
    ))
    expect(without).not.toMatch(/width:\s*36px/)
  })

  it('uses a two-column grid layout in split mode', () => {
    const markup = renderMarkup(() => <DiffViewer before={before} after={after} mode="split" />)
    expect(markup).toContain('grid')
  })

  it('forwards className', () => {
    const markup = renderMarkup(() => (
      <DiffViewer before={before} after={after} className="dv-cls" />
    ))
    expect(markup).toContain('dv-cls')
  })
})
