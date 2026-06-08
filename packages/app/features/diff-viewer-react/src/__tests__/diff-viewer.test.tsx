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

const { DiffViewer } = await import('../DiffViewer.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const before = 'line one\nline two\nline three'
const after = 'line one\nline TWO\nline three'

describe('DiffViewer', () => {
  it('renders all lines from before and after', () => {
    const markup = html(createElement(DiffViewer, { before, after }))
    expect(markup).toContain('line one')
    expect(markup).toContain('line two')
    expect(markup).toContain('line TWO')
    expect(markup).toContain('line three')
  })

  it('marks removed lines with "-" and added lines with "+"', () => {
    const markup = html(createElement(DiffViewer, { before, after }))
    expect(markup).toContain('-')
    expect(markup).toContain('+')
  })

  it('highlights add/remove rows with the appropriate background color', () => {
    const markup = html(createElement(DiffViewer, { before, after }))
    expect(markup).toContain('rgba(34,197,94,0.15)')
    expect(markup).toContain('rgba(239,68,68,0.15)')
  })

  it('renders the filename header when present and omits it otherwise', () => {
    expect(html(createElement(DiffViewer, { before, after, filename: 'app.ts' }))).toContain(
      'app.ts',
    )
    expect(html(createElement(DiffViewer, { before, after }))).not.toContain('<header')
  })

  it('renders line numbers by default and omits them when showLineNumbers is false', () => {
    const withNums = html(createElement(DiffViewer, { before, after }))
    expect(withNums).toContain('width:36px')
    const without = html(createElement(DiffViewer, { before, after, showLineNumbers: false }))
    expect(without).not.toContain('width:36px')
  })

  it('uses a two-column grid layout in split mode', () => {
    const markup = html(createElement(DiffViewer, { before, after, mode: 'split' }))
    expect(markup).toContain('grid')
  })

  it('forwards className', () => {
    const markup = html(createElement(DiffViewer, { before, after, className: 'dv-cls' }))
    expect(markup).toContain('dv-cls')
  })
})
