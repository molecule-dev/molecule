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
}))

const { CodeBlock } = await import('../CodeBlock.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const code = 'const x = 1\nconst y = 2\nconsole.log(x + y)'

describe('CodeBlock', () => {
  it('renders the source code', () => {
    const markup = html(createElement(CodeBlock, { code }))
    expect(markup).toContain('console.log(x + y)')
  })

  it('renders the filename and language tag in the header', () => {
    const markup = html(createElement(CodeBlock, { code, filename: 'sum.ts', language: 'ts' }))
    expect(markup).toContain('sum.ts')
    expect(markup).toContain('ts')
  })

  it('omits the header when there is no filename/language and copy is disabled', () => {
    const markup = html(createElement(CodeBlock, { code, showCopy: false }))
    expect(markup).not.toContain('<header')
  })

  it('renders the copy button by default', () => {
    const markup = html(createElement(CodeBlock, { code }))
    expect(markup).toContain('data-button=""')
    expect(markup).toContain('Copy')
  })

  it('renders line numbers by default and omits them when showLineNumbers is false', () => {
    const withNums = html(createElement(CodeBlock, { code }))
    expect(withNums).toContain('>1<')
    expect(withNums).toContain('>2<')
    expect(withNums).toContain('>3<')
    const without = html(createElement(CodeBlock, { code, showLineNumbers: false }))
    expect(without).not.toContain('>1<')
  })

  it('forwards className', () => {
    const markup = html(createElement(CodeBlock, { code, className: 'cb-cls' }))
    expect(markup).toContain('cb-cls')
  })
})
