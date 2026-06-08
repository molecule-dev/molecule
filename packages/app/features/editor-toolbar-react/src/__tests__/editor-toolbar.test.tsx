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

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children, disabled }: { children?: ReactNode; disabled?: boolean }) =>
    createElement('button', { 'data-button': '', disabled }, children),
}))

const { EditorToolbar } = await import('../EditorToolbar.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('EditorToolbar', () => {
  it('renders the title inside an <h1>', () => {
    const markup = html(createElement(EditorToolbar, { title: 'My Post' }))
    expect(markup).toContain('<h1')
    expect(markup).toContain('My Post')
  })

  it('renders the badge and leading slots', () => {
    const markup = html(
      createElement(EditorToolbar, {
        title: 'T',
        badge: createElement('span', { 'data-badge': '' }),
        leading: createElement('span', { 'data-leading': '' }),
      }),
    )
    expect(markup).toContain('data-badge=""')
    expect(markup).toContain('data-leading=""')
  })

  it('renders primary and secondary action buttons', () => {
    const markup = html(
      createElement(EditorToolbar, {
        title: 'T',
        primaryActions: [{ id: 'save', label: 'Save', onClick: () => {} }],
        secondaryActions: [{ id: 'help', label: 'Help', onClick: () => {} }],
      }),
    )
    expect(markup).toContain('Save')
    expect(markup).toContain('Help')
  })

  it('renders an action as an anchor when it has an href', () => {
    const markup = html(
      createElement(EditorToolbar, {
        title: 'T',
        primaryActions: [{ id: 'view', label: 'View', href: '/preview' }],
      }),
    )
    expect(markup).toContain('href="/preview"')
  })

  it('disables an action flagged disabled', () => {
    const markup = html(
      createElement(EditorToolbar, {
        title: 'T',
        primaryActions: [{ id: 'save', label: 'Save', onClick: () => {}, disabled: true }],
      }),
    )
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('applies the sticky inline style by default and drops it when sticky is false', () => {
    expect(html(createElement(EditorToolbar, { title: 'T' }))).toContain('position:sticky')
    expect(html(createElement(EditorToolbar, { title: 'T', sticky: false }))).not.toContain(
      'position:sticky',
    )
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = html(
      createElement(EditorToolbar, { title: 'T', dataMolId: 'et-x', className: 'et-cls' }),
    )
    expect(markup).toContain('data-mol-id="et-x"')
    expect(markup).toContain('et-cls')
  })
})
