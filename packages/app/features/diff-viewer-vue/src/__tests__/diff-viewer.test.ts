// @vitest-environment jsdom
/**
 * Unit tests for the Vue `DiffViewer` — a port of
 * `@molecule/app-diff-viewer-react/src/__tests__/diff-viewer.test.tsx`: the
 * same behavioral assertions, rendered with Vue in jsdom and asserted on the
 * markup the component produces.
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

import { createApp, defineComponent, h } from 'vue'

import { DiffViewer } from '../DiffViewer.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link DiffViewer} and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(DiffViewer, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const before = 'line one\nline two\nline three'
const after = 'line one\nline TWO\nline three'

describe('DiffViewer', () => {
  it('renders all lines from before and after', () => {
    const markup = render({ before, after })
    expect(markup).toContain('line one')
    expect(markup).toContain('line two')
    expect(markup).toContain('line TWO')
    expect(markup).toContain('line three')
  })

  it('marks removed lines with "-" and added lines with "+"', () => {
    const markup = render({ before, after })
    expect(markup).toContain('-')
    expect(markup).toContain('+')
  })

  it('highlights add/remove rows with the appropriate background color', () => {
    const markup = render({ before, after })
    expect(markup).toContain('rgba(34, 197, 94, 0.15)')
    expect(markup).toContain('rgba(239, 68, 68, 0.15)')
  })

  it('renders the filename header when present and omits it otherwise', () => {
    expect(render({ before, after, filename: 'app.ts' })).toContain('app.ts')
    expect(render({ before, after })).not.toContain('<header')
  })

  it('renders line numbers by default and omits them when showLineNumbers is false', () => {
    const withNums = render({ before, after })
    expect(withNums).toContain('width: 36px')
    const without = render({ before, after, showLineNumbers: false })
    expect(without).not.toContain('width: 36px')
  })

  it('uses a two-column grid layout in split mode', () => {
    const markup = render({ before, after, mode: 'split' })
    expect(markup).toContain('grid')
  })

  it('forwards className', () => {
    const markup = render({ before, after, className: 'dv-cls' })
    expect(markup).toContain('dv-cls')
  })
})
