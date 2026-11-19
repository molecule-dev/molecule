// @vitest-environment jsdom
/**
 * `Dropdown`'s `onOpenChange` contract with an owner that follows it (the
 * usual controlled wiring, `open={open} onOpenChange={setOpen}`) — Vue port
 * of `@molecule/app-ui-react/src/__tests__/dropdown-open-change.test.tsx`:
 * the menu reports a change only when one happens (a toggle, a selection,
 * Escape, a route change), so an owner that follows every report keeps the
 * menu open until something closes it.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

// A mutable location the mocked `useLocation` returns: tests replace it to
// simulate SPA navigation.
const { location } = await vi.hoisted(async () => {
  const { shallowRef } = await import('vue')
  return {
    location: shallowRef<{ pathname: string; search: string }>({ pathname: '/', search: '' }),
  }
})

vi.mock('@molecule/app-vue', () => ({
  useLocation: () => location,
}))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
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

import { within } from '@testing-library/dom'
import { type App, createApp, defineComponent, h, nextTick, ref } from 'vue'

const { Dropdown } = await import('../components/Dropdown.js')

const ITEMS = [
  { label: 'Profile', value: 'profile' },
  { label: 'Settings', value: 'settings' },
]

const apps: App[] = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
  location.value = { pathname: '/', search: '' }
})

/**
 * Mounts a render function into a fresh host.
 *
 * @param render - The component render.
 */
function mount(render: () => unknown): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  const app = createApp({ render: () => render() })
  apps.push(app)
  app.mount(host)
}

const body = (): ReturnType<typeof within> => within(document.body)

const optionsButton = (): HTMLElement => body().getByRole('button', { name: 'Options' })

/**
 * An owner that follows every `onOpenChange` report (Vue's `onOpenChange`
 * listener is the framework's form of React's `onOpenChange` prop).
 *
 * @param initialOpen - Whether the owner starts with the menu open.
 * @param onReport - Called with every reported open state.
 */
function mountOwner(initialOpen: boolean, onReport: (open: boolean) => void): void {
  const Owner = defineComponent({
    setup() {
      const open = ref(initialOpen)
      return () =>
        h(Dropdown, {
          trigger: h('button', { type: 'button' }, 'Options'),
          items: ITEMS,
          open: open.value,
          onOpenChange: (next: boolean) => {
            onReport(next)
            open.value = next
          },
        })
    },
  })
  mount(() => h(Owner))
}

describe('Dropdown onOpenChange with an owner that follows it', () => {
  it('keeps a menu mounted open open, and reports nothing on mount', async () => {
    const onReport = vi.fn()
    mountOwner(true, onReport)
    await nextTick()

    expect(body().getByRole('menu')).toBeDefined()
    expect(onReport).not.toHaveBeenCalled()
  })

  it('keeps a menu opened by the trigger open', async () => {
    const onReport = vi.fn()
    mountOwner(false, onReport)

    optionsButton().click()
    await nextTick()

    expect(body().getByRole('menu')).toBeDefined()
    expect(onReport.mock.calls).toEqual([[true]])
  })

  it('closes through onOpenChange when the route changes', async () => {
    const onReport = vi.fn()
    mountOwner(false, onReport)
    optionsButton().click()
    await nextTick()

    location.value = { pathname: '/settings', search: '' }
    await nextTick()

    expect(body().queryByRole('menu')).toBeNull()
    expect(onReport.mock.calls).toEqual([[true], [false]])
  })
})

describe('uncontrolled Dropdown onOpenChange', () => {
  it('reports nothing on mount, then each toggle and the route-change close', async () => {
    const onOpenChange = vi.fn()
    mount(() =>
      h(Dropdown, {
        trigger: h('button', { type: 'button' }, 'Options'),
        items: ITEMS,
        onOpenChange,
      }),
    )
    await nextTick()
    expect(onOpenChange).not.toHaveBeenCalled()

    optionsButton().click()
    await nextTick()
    expect(body().getByRole('menu')).toBeDefined()

    location.value = { pathname: '/', search: '?tab=2' }
    await nextTick()

    expect(body().queryByRole('menu')).toBeNull()
    expect(onOpenChange.mock.calls).toEqual([[true], [false]])
  })
})
