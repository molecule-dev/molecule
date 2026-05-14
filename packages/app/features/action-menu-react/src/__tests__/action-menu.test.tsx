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

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({
    children,
    ['aria-label']: ariaLabel,
    ['aria-haspopup']: ariaHaspopup,
    ['aria-expanded']: ariaExpanded,
  }: {
    children?: ReactNode
    'aria-label'?: string
    'aria-haspopup'?: string
    'aria-expanded'?: boolean
  }) =>
    createElement(
      'button',
      {
        'data-button': '',
        'aria-label': ariaLabel,
        'aria-haspopup': ariaHaspopup,
        'aria-expanded': ariaExpanded,
      },
      children,
    ),
}))

const { ActionMenu } = await import('../ActionMenu.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const items = [
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete', destructive: true },
]

// The popover list only mounts after a click (open state) — not reachable via
// SSR. These tests cover the always-rendered trigger surface.
describe('ActionMenu (trigger surface)', () => {
  it('renders the trigger with the default "Actions" aria-label', () => {
    const markup = html(createElement(ActionMenu, { items }))
    expect(markup).toContain('aria-label="Actions"')
  })

  it('honours a custom triggerAriaLabel', () => {
    const markup = html(createElement(ActionMenu, { items, triggerAriaLabel: 'Row actions' }))
    expect(markup).toContain('aria-label="Row actions"')
  })

  it('marks the trigger as a menu popup that starts collapsed', () => {
    const markup = html(createElement(ActionMenu, { items }))
    expect(markup).toContain('aria-haspopup="menu"')
    expect(markup).toContain('aria-expanded="false"')
  })

  it('renders the default "⋮" trigger glyph', () => {
    const markup = html(createElement(ActionMenu, { items }))
    expect(markup).toContain('⋮')
  })

  it('renders a custom trigger node', () => {
    const markup = html(
      createElement(ActionMenu, { items, trigger: createElement('span', { 'data-trigger': '' }) }),
    )
    expect(markup).toContain('data-trigger=""')
    expect(markup).not.toContain('⋮')
  })

  it('does not render the popover list before it is opened', () => {
    const markup = html(createElement(ActionMenu, { items }))
    expect(markup).not.toContain('role="menu"')
  })

  it('forwards className onto the wrapper', () => {
    const markup = html(createElement(ActionMenu, { items, className: 'am-cls' }))
    expect(markup).toContain('am-cls')
  })
})
