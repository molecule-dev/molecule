// @vitest-environment jsdom
/**
 * Render tests for the close-on-route-change behavior shared by the overlay
 * components (`UserMenu`, `SidebarUserCard`, `Dropdown`) — Vue port of
 * `@molecule/app-ui-react/src/__tests__/overlay-route-close.test.tsx`:
 * opening the overlay and then changing the route must dismiss it (an
 * overlay left mounted over the next page blocks clicks underneath).
 *
 * @module
 */
import { within } from '@testing-library/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A reactive location the mocked `useLocation` returns — tests replace it to
// simulate SPA navigation; Vue reactivity performs the re-render.
const { location } = await vi.hoisted(async () => {
  const { shallowRef } = await import('vue')
  return {
    location: shallowRef<{ pathname: string; search: string }>({ pathname: '/', search: '' }),
  }
})

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useLocation: () => location,
  useTranslation: () => ({
    t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
  useAuth: () => ({ user: { value: { name: 'Ada', email: 'ada@example.com' } } }),
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

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { type App, createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

const { UserMenu } = await import('../components/UserMenu.js')
const { SidebarUserCard } = await import('../components/SidebarUserCard.js')
const { Dropdown } = await import('../components/Dropdown.js')
const { usePanelClose } = await import('../components/PanelClose.js')

const apps: App[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  document.body.innerHTML = ''
  location.value = { pathname: '/', search: '' }
})

/**
 * Mounts a render function into a fresh host, the way the existing Vue tests
 * do (teleported overlays are found through `document.body`).
 *
 * @param render - The component render.
 */
function mount(render: () => VNodeChild): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({ render })
  apps.push(app)
  app.mount(host)
}

const body = (): ReturnType<typeof within> => within(document.body)

describe('UserMenu — close on route change', () => {
  it('dismisses the open drawer when the route changes', async () => {
    mount(() =>
      h(UserMenu, null, {
        default: () => h('div', { 'data-mol-id': 'panel-body' }, 'panel'),
      }),
    )
    // Drawer is closed initially.
    expect(body().queryByText('panel')).toBeNull()
    // Open it.
    body().getByRole('button').click()
    await nextTick()
    expect(body().getByText('panel')).toBeDefined()
    // Navigate — the location watcher must close the drawer.
    location.value = { pathname: '/settings', search: '' }
    await nextTick()
    expect(body().queryByText('panel')).toBeNull()
  })
})

describe('SidebarUserCard — close on route change', () => {
  it('dismisses the open drawer when the route changes', async () => {
    mount(() => h(SidebarUserCard, null, { default: () => h('div', null, 'sidebar-panel') }))
    body().getByRole('button').click()
    await nextTick()
    expect(body().getByText('sidebar-panel')).toBeDefined()
    location.value = { pathname: '/profile', search: '' }
    await nextTick()
    expect(body().queryByText('sidebar-panel')).toBeNull()
  })
})

describe('usePanelClose — panel content dismisses its drawer', () => {
  it('lets UserMenu panel children close the drawer via context', async () => {
    /** Panel that calls `usePanelClose` to dismiss its parent drawer. */
    const ClosingPanel = defineComponent({
      name: 'ClosingPanel',
      setup() {
        const close = usePanelClose()
        return () => h('button', { type: 'button', onClick: close }, 'dismiss')
      },
    })
    mount(() => h(UserMenu, null, { default: () => h(ClosingPanel) }))
    // Open the drawer, then close it from inside the panel.
    body().getByRole('button', { name: 'Open user menu' }).click()
    await nextTick()
    expect(body().getByText('dismiss')).toBeDefined()
    body().getByText('dismiss').click()
    await nextTick()
    expect(body().queryByText('dismiss')).toBeNull()
  })
})

describe('Dropdown — close on route change', () => {
  it('dismisses the open menu when the route changes', async () => {
    const items = [{ label: 'Item A', value: 'a' }]
    const trigger = (): VNodeChild => h('button', { type: 'button' }, 'Open menu')
    mount(() => h(Dropdown, { trigger: trigger(), items }))
    body().getByText('Open menu').click()
    await nextTick()
    expect(body().getByText('Item A')).toBeDefined()
    location.value = { pathname: '/elsewhere', search: '' }
    await nextTick()
    expect(body().queryByText('Item A')).toBeNull()
  })
})
