import type { ReactNode } from 'react'
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

const { WikiPageHeader } = await import('../WikiPageHeader.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('WikiPageHeader', () => {
  it('renders the title inside an <h1>', () => {
    const markup = html(createElement(WikiPageHeader, { title: 'Getting Started' }))
    expect(markup).toContain('<h1')
    expect(markup).toContain('Getting Started')
  })

  it('renders the breadcrumb slot', () => {
    const markup = html(
      createElement(WikiPageHeader, {
        title: 'T',
        breadcrumb: createElement('nav', { 'data-crumb': '' }),
      }),
    )
    expect(markup).toContain('data-crumb=""')
  })

  it('renders the version, updatedAt, and updatedBy meta', () => {
    const markup = html(
      createElement(WikiPageHeader, {
        title: 'T',
        version: 'v23',
        updatedAt: '2 days ago',
        updatedBy: 'Jane',
      }),
    )
    expect(markup).toContain('v23')
    expect(markup).toContain('Updated')
    expect(markup).toContain('2 days ago')
    expect(markup).toContain('Jane')
  })

  it('renders the Edit / History buttons only when their handlers are supplied', () => {
    const withActions = html(
      createElement(WikiPageHeader, { title: 'T', onEdit: () => {}, onHistory: () => {} }),
    )
    expect(withActions).toContain('Edit')
    expect(withActions).toContain('History')
    const without = html(createElement(WikiPageHeader, { title: 'T' }))
    expect(without).not.toContain('Edit')
    expect(without).not.toContain('History')
  })

  it('renders the tags and extraActions slots', () => {
    const markup = html(
      createElement(WikiPageHeader, {
        title: 'T',
        tags: createElement('span', { 'data-tags': '' }),
        extraActions: createElement('button', { 'data-extra': '' }),
      }),
    )
    expect(markup).toContain('data-tags=""')
    expect(markup).toContain('data-extra=""')
  })

  it('forwards className', () => {
    const markup = html(createElement(WikiPageHeader, { title: 'T', className: 'wph-cls' }))
    expect(markup).toContain('wph-cls')
  })
})
