// @vitest-environment jsdom
/**
 * The trigger's aria-label goes through i18n — a port of
 * `@molecule/app-action-menu-react/src/__tests__/action-menu-i18n.test.tsx`:
 * the same test names and assertions, rendered with Solid in jsdom. The
 * default label was a literal fallback (`props.triggerAriaLabel ?? 'Actions'`),
 * so it rendered plain English in every locale; these tests mock
 * `useTranslation` with a `t` that marks every key, so a default that bypassed
 * `t()` would show up as plain English.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ActionMenuProps } from '../types.js'

// A Proxy ClassMap that echoes each accessed member name back as its token —
// the same mock the Solid suite uses.
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

// A Button marker that forwards every pass-through attribute (aria-*,
// data-mol-id) onto a native <button>, as the Solid suite's Button mock does.
vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: {
    children?: JSX.Element
    onClick?: () => void
    'aria-label'?: string
    'aria-haspopup'?: JSX.ButtonHTMLAttributes<HTMLButtonElement>['aria-haspopup']
    'aria-expanded'?: boolean
    'data-mol-id'?: string
  }) => (
    <button
      data-button=""
      onClick={() => props.onClick?.()}
      aria-label={props['aria-label']}
      aria-haspopup={props['aria-haspopup']}
      aria-expanded={props['aria-expanded']}
      data-mol-id={props['data-mol-id']}
    >
      {props.children}
    </button>
  ),
}))
// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { ActionMenu } = await import('../ActionMenu.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders an {@link ActionMenu} with Solid's browser renderer.
 *
 * @param props - Props to pass to `<ActionMenu>`.
 * @returns The container element.
 */
function mount(props: ActionMenuProps): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <ActionMenu {...props} />, container))
  return container
}

const items = [
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete', destructive: true },
]

describe('ActionMenu i18n', () => {
  it('renders the trigger aria-label through t', () => {
    const container = mount({ items })
    const trigger = container.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('«actionMenu.aria.trigger»')
  })

  it('an explicit triggerAriaLabel overrides the translated label', () => {
    const container = mount({ items, triggerAriaLabel: 'Row actions' })
    const trigger = container.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Row actions')
  })
})
