/**
 * Render tests for the close-on-route-change behavior shared by the
 * overlay components (`UserMenu`, `SidebarUserCard`, `Dropdown`):
 * opening the overlay and then changing the route must dismiss it (an
 * overlay left mounted over the next page blocks clicks underneath).
 *
 * @vitest-environment jsdom
 * @module
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A mutable location the mocked `useLocation` returns — tests advance it
// to simulate SPA navigation, then re-render.
const mockLocation = { pathname: '/', search: '' }

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ ...mockLocation }),
}))

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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
  useAuth: () => ({ user: { name: 'Ada', email: 'ada@example.com' } }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

const { UserMenu } = await import('../components/UserMenu.js')
const { SidebarUserCard } = await import('../components/SidebarUserCard.js')
const { Dropdown } = await import('../components/Dropdown.js')

afterEach(() => {
  mockLocation.pathname = '/'
  mockLocation.search = ''
})

describe('UserMenu — close on route change', () => {
  it('dismisses the open drawer when the route changes', () => {
    const { rerender } = render(
      <UserMenu renderPanel={() => <div data-mol-id="panel-body">panel</div>} />,
    )
    // Drawer is closed initially.
    expect(screen.queryByTestId?.('panel-body')).toBeFalsy()
    // Open it.
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('panel')).toBeDefined()
    // Navigate — the location effect must close the drawer.
    mockLocation.pathname = '/settings'
    rerender(<UserMenu renderPanel={() => <div data-mol-id="panel-body">panel</div>} />)
    expect(screen.queryByText('panel')).toBeNull()
  })
})

describe('SidebarUserCard — close on route change', () => {
  it('dismisses the open drawer when the route changes', () => {
    const panel = () => <div>sidebar-panel</div>
    const { rerender } = render(<SidebarUserCard renderPanel={panel} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('sidebar-panel')).toBeDefined()
    mockLocation.pathname = '/profile'
    rerender(<SidebarUserCard renderPanel={panel} />)
    expect(screen.queryByText('sidebar-panel')).toBeNull()
  })
})

describe('Dropdown — close on route change', () => {
  it('dismisses the open menu when the route changes', () => {
    const items = [{ label: 'Item A', value: 'a' }]
    const trigger = <button type="button">Open menu</button>
    const { rerender } = render(<Dropdown trigger={trigger} items={items} />)
    fireEvent.click(screen.getByText('Open menu'))
    expect(screen.getByText('Item A')).toBeDefined()
    mockLocation.pathname = '/elsewhere'
    rerender(<Dropdown trigger={trigger} items={items} />)
    expect(screen.queryByText('Item A')).toBeNull()
  })
})
