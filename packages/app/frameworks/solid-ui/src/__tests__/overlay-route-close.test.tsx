// @vitest-environment jsdom
/**
 * Close-on-route-change behavior shared by the overlay components
 * (`UserMenu`, `SidebarUserCard`, `Dropdown`): opening the overlay and then
 * changing the route must dismiss it (an overlay left mounted over the next
 * page blocks clicks underneath).
 *
 * Solid counterpart of `@molecule/app-ui-react`'s `overlay-route-close` test:
 * the mocked `useLocation` reads a reactive signal, so a navigation is a
 * signal write instead of React's `rerender`.
 *
 * @module
 */
import { fireEvent, within } from '@testing-library/dom'
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
        // Every other token is a callable that returns its own name —
        // components use both `cm.foo` and `cm.foo({...})` forms.
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The mocked `useLocation` reads the same reactive location the tests change.
vi.mock('@molecule/app-solid', async () => {
  const { overlayLocation } = await import('./overlay-location-fixture.js')
  return {
    useLocation: () => overlayLocation,
    useTranslation: () => ({
      t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
        opts?.defaultValue ?? _key,
    }),
    useAuth: () => ({ user: () => ({ name: 'Ada', email: 'ada@example.com' }) }),
  }
})

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { setOverlayLocation } from './overlay-location-fixture.js'

const { UserMenu } = await import('../components/UserMenu.jsx')
const { SidebarUserCard } = await import('../components/SidebarUserCard.jsx')
const { Dropdown } = await import('../components/Dropdown.jsx')
const { usePanelClose } = await import('../components/PanelClose.jsx')

const disposers: Array<() => void> = []

/** Mounts JSX into a fresh container and registers its disposer. */
function mount(jsx: () => JSX.Element): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(jsx, container))
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  setOverlayLocation({ pathname: '/', search: '' })
})

describe('UserMenu — close on route change', () => {
  it('dismisses the open drawer when the route changes', () => {
    mount(() => (
      <UserMenu>
        <div data-mol-id="panel-body">panel</div>
      </UserMenu>
    ))
    // Drawer is closed initially.
    expect(within(document.body).queryByText('panel')).toBeNull()
    // Open it.
    fireEvent.click(within(document.body).getByRole('button'))
    expect(within(document.body).getByText('panel')).toBeDefined()
    // Navigate — the location effect must close the drawer.
    setOverlayLocation({ pathname: '/settings', search: '' })
    expect(within(document.body).queryByText('panel')).toBeNull()
  })
})

describe('SidebarUserCard — close on route change', () => {
  it('dismisses the open drawer when the route changes', () => {
    mount(() => (
      <SidebarUserCard>
        <div>sidebar-panel</div>
      </SidebarUserCard>
    ))
    fireEvent.click(within(document.body).getByRole('button'))
    expect(within(document.body).getByText('sidebar-panel')).toBeDefined()
    setOverlayLocation({ pathname: '/profile', search: '' })
    expect(within(document.body).queryByText('sidebar-panel')).toBeNull()
  })
})

describe('usePanelClose — panel content dismisses its drawer', () => {
  it('lets UserMenu panel children close the drawer via context', () => {
    /** Panel that calls `usePanelClose` to dismiss its parent drawer. */
    function ClosingPanel(): JSX.Element {
      const close = usePanelClose()
      return (
        <button type="button" onClick={close}>
          dismiss
        </button>
      )
    }
    mount(() => (
      <UserMenu>
        <ClosingPanel />
      </UserMenu>
    ))
    // Open the drawer, then close it from inside the panel.
    fireEvent.click(within(document.body).getByRole('button', { name: 'Open user menu' }))
    expect(within(document.body).getByText('dismiss')).toBeDefined()
    fireEvent.click(within(document.body).getByText('dismiss'))
    expect(within(document.body).queryByText('dismiss')).toBeNull()
  })
})

describe('Dropdown — close on route change', () => {
  it('dismisses the open menu when the route changes', () => {
    const items = [{ label: 'Item A', value: 'a' }]
    mount(() => <Dropdown trigger={<button type="button">Open menu</button>} items={items} />)
    fireEvent.click(within(document.body).getByText('Open menu'))
    expect(within(document.body).getByText('Item A')).toBeDefined()
    setOverlayLocation({ pathname: '/elsewhere', search: '' })
    expect(within(document.body).queryByText('Item A')).toBeNull()
  })
})
