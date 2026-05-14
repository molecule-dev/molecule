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

const { ListItemRow } = await import('../ListItemRow.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('ListItemRow', () => {
  it('renders the title', () => {
    const markup = html(createElement(ListItemRow, { title: 'Inbox' }))
    expect(markup).toContain('Inbox')
  })

  it('renders subtitle and metadata when present and omits them otherwise', () => {
    const full = html(
      createElement(ListItemRow, { title: 'T', subtitle: 'sub-x', metadata: 'meta-x' }),
    )
    expect(full).toContain('sub-x')
    expect(full).toContain('meta-x')
    const bare = html(createElement(ListItemRow, { title: 'T' }))
    expect(bare).not.toContain('sub-x')
    expect(bare).not.toContain('meta-x')
  })

  it('renders the leading and actions slots', () => {
    const markup = html(
      createElement(ListItemRow, {
        title: 'T',
        leading: createElement('span', { 'data-leading': '' }),
        actions: createElement('span', { 'data-actions': '' }),
      }),
    )
    expect(markup).toContain('data-leading=""')
    expect(markup).toContain('data-actions=""')
  })

  it('exposes a button role and clickable cursor only when onClick is supplied', () => {
    const clickable = html(createElement(ListItemRow, { title: 'T', onClick: () => {} }))
    expect(clickable).toContain('role="button"')
    expect(clickable).toContain('cursorPointer')
    const plain = html(createElement(ListItemRow, { title: 'T' }))
    expect(plain).not.toContain('role="button"')
  })

  it('reflects the selected state via aria-selected', () => {
    const markup = html(createElement(ListItemRow, { title: 'T', selected: true }))
    expect(markup).toContain('aria-selected="true"')
  })

  it('reflects the disabled state via aria-disabled and dimmed opacity', () => {
    const markup = html(createElement(ListItemRow, { title: 'T', disabled: true }))
    expect(markup).toContain('aria-disabled="true"')
    expect(markup).toContain('opacity:0.5')
  })

  it('forwards className', () => {
    const markup = html(createElement(ListItemRow, { title: 'T', className: 'lir-cls' }))
    expect(markup).toContain('lir-cls')
  })
})
