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
  Button: ({
    children,
    disabled,
    color,
  }: {
    children?: ReactNode
    disabled?: boolean
    color?: string
  }) => createElement('button', { 'data-button': '', disabled, 'data-color': color }, children),
}))

const { BulkActionToolbar } = await import('../BulkActionToolbar.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const actions = [
  { id: 'archive', label: 'Archive', onClick: () => {} },
  { id: 'delete', label: 'Delete', onClick: () => {}, destructive: true },
]

describe('BulkActionToolbar', () => {
  it('renders nothing when the selection count is 0', () => {
    expect(html(createElement(BulkActionToolbar, { count: 0, actions }))).toBe('')
  })

  it('renders the selection count when count > 0', () => {
    const markup = html(createElement(BulkActionToolbar, { count: 3, actions }))
    expect(markup).toContain('3 selected')
  })

  it('renders a button per action', () => {
    const markup = html(createElement(BulkActionToolbar, { count: 1, actions }))
    expect(markup).toContain('Archive')
    expect(markup).toContain('Delete')
  })

  it('colors destructive actions with the error variant', () => {
    const markup = html(createElement(BulkActionToolbar, { count: 1, actions }))
    expect(markup).toContain('data-color="error"')
  })

  it('disables an action flagged disabled', () => {
    const markup = html(
      createElement(BulkActionToolbar, {
        count: 1,
        actions: [{ id: 'x', label: 'X', onClick: () => {}, disabled: true }],
      }),
    )
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('renders the clear button only when onClearSelection is supplied', () => {
    const withClear = html(
      createElement(BulkActionToolbar, { count: 1, actions, onClearSelection: () => {} }),
    )
    expect(withClear).toContain('Clear')
    const without = html(createElement(BulkActionToolbar, { count: 1, actions }))
    expect(without).not.toContain('Clear')
  })

  it('exposes a labelled region role and forwards className', () => {
    const markup = html(
      createElement(BulkActionToolbar, { count: 1, actions, className: 'bat-cls' }),
    )
    expect(markup).toContain('role="region"')
    expect(markup).toContain('aria-label="Bulk actions"')
    expect(markup).toContain('bat-cls')
  })
})
