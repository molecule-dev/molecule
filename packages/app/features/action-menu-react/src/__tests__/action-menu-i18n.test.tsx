// @vitest-environment jsdom
/**
 * The trigger's aria-label goes through i18n.
 *
 * The default label was a prop-parameter default (`triggerAriaLabel = 'Actions'`),
 * so it rendered plain English in every locale — the pseudo-locale check saw it
 * in the recorded goldens and no lint rule sees a parameter default. These tests
 * mock `useTranslation` with a `t` that marks every key, so a default that
 * bypassed `t()` would show up as plain English.
 *
 * @module
 */
import { cleanup, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A Proxy ClassMap that echoes each accessed member name back as its token, so
// tests can assert *which* cm.* member a class came from — the same mock the
// React suite uses.
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

// Mock Button forwards every pass-through attribute (aria-*, data-mol-id) onto
// a native <button>, as the React suite's Button mock does.
vi.mock('@molecule/app-ui-react', () => ({
  Button: ({
    children,
    onClick,
    ['aria-label']: ariaLabel,
    ['aria-haspopup']: ariaHaspopup,
    ['aria-expanded']: ariaExpanded,
    ['data-mol-id']: dataMolId,
  }: {
    children?: ReactNode
    onClick?: () => void
    'aria-label'?: string
    'aria-haspopup'?: string
    'aria-expanded'?: boolean
    'data-mol-id'?: string
  }) =>
    createElement(
      'button',
      {
        'data-button': '',
        onClick,
        'aria-label': ariaLabel,
        'aria-haspopup': ariaHaspopup,
        'aria-expanded': ariaExpanded,
        'data-mol-id': dataMolId,
      },
      children,
    ),
}))
// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { ActionMenu } = await import('../ActionMenu.js')

const items = [
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete', destructive: true },
]

afterEach(() => cleanup())

describe('ActionMenu i18n', () => {
  it('renders the trigger aria-label through t', () => {
    const { container } = render(createElement(ActionMenu, { items }))
    const trigger = container.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('«actionMenu.aria.trigger»')
  })

  it('an explicit triggerAriaLabel overrides the translated label', () => {
    const { container } = render(
      createElement(ActionMenu, { items, triggerAriaLabel: 'Row actions' }),
    )
    const trigger = container.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Row actions')
  })
})
