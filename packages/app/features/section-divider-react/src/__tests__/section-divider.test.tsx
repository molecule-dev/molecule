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

const { SectionDivider } = await import('../SectionDivider.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('SectionDivider', () => {
  it('exposes a horizontal separator role', () => {
    const markup = html(createElement(SectionDivider, {}))
    expect(markup).toContain('role="separator"')
    expect(markup).toContain('aria-orientation="horizontal"')
  })

  it('renders the label children when present', () => {
    const markup = html(createElement(SectionDivider, {}, 'OR'))
    expect(markup).toContain('OR')
  })

  it('renders flanking lines on both sides for center alignment', () => {
    const markup = html(createElement(SectionDivider, { align: 'center' }, 'OR'))
    expect(markup.split('border-top:1px solid currentColor').length - 1).toBe(2)
  })

  it('renders a single flanking line for start alignment', () => {
    const markup = html(createElement(SectionDivider, { align: 'start' }, 'Today'))
    expect(markup.split('border-top:1px solid currentColor').length - 1).toBe(1)
  })

  it('renders a single flanking line for end alignment', () => {
    const markup = html(createElement(SectionDivider, { align: 'end' }, 'Today'))
    expect(markup.split('border-top:1px solid currentColor').length - 1).toBe(1)
  })

  it('forwards className', () => {
    const markup = html(createElement(SectionDivider, { className: 'sd-cls' }))
    expect(markup).toContain('sd-cls')
  })
})
