// @vitest-environment jsdom
/**
 * Svelte port of
 * `@molecule/app-ui-react/src/__tests__/render-time-state-adjustments.test.tsx`:
 * the state these components adjust when an input changes, rather than in an
 * effect or on the next user action:
 *
 * - `Dropdown` with a controlled `open` reports a route-change close through
 *   `onOpenChange` (the owner scripts hold the state, so the component cannot
 *   close itself);
 * - `Dropdown width="trigger"` sizes the menu from the trigger width measured
 *   at commit, not from a stale value;
 * - a reopened `PromptDialog` seeds its input from the CURRENT `initialValue`.
 *
 * The framework differences: `rerender` becomes a store update plus a flush
 * (`tick()`/`flushSync()`), and `useState` in the owner becomes a writable
 * store the host component passes down — Svelte's idiom for caller-held state.
 *
 * @module
 */
import { fireEvent, screen } from '@testing-library/dom'
import { type Writable, writable } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

/** The route location shape the mocked `useLocation` exposes. */
interface RouteLocation {
  pathname: string
  search: string
}

/** The mutable location the mocked `useLocation` returns; tests advance it. */
let routeStore: Writable<RouteLocation>

vi.mock('@molecule/app-svelte', async (importOriginal) => {
  const { writable } = await import('svelte/store')
  routeStore = writable<RouteLocation>({ pathname: '/', search: '' })
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useLocation: () => routeStore,
    useTranslation: () => ({
      t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
        opts?.defaultValue ?? _key,
    }),
  }
})

// The kit's Input, Select and Textarea read `fieldLayout` from this module, so the actual module
// stays and only the ClassMap is replaced.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { type Component, flushSync, mount, tick, unmount } from 'svelte'

const { default: RenderTimeDropdownHost } = await import('./RenderTimeDropdownHost.svelte')
const { default: PromptDialogReopenHost } = await import('./PromptDialogReopenHost.svelte')

const items = [{ value: 'a', label: 'Item A' }]

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

/**
 * Mounts a host component into a fresh container appended to the body.
 *
 * @param component - The host component to mount.
 * @param props - The host props.
 * @returns The container element.
 */
function renderHost<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(mount(component, { target: host, props }))
  flushSync()
  return host
}

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
  routeStore.set({ pathname: '/', search: '' })
  vi.restoreAllMocks()
})

describe('Dropdown — controlled open closes on route change', () => {
  it('reports the close through onOpenChange instead of only resetting internally', async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>()
    const open = writable(false)
    renderHost(RenderTimeDropdownHost, {
      open,
      items,
      onOpenChange: (next: boolean) => {
        onOpenChange(next)
        open.set(next)
      },
    })

    screen.getByRole('button', { name: 'Actions' }).click()
    flushSync()
    expect(screen.getByText('Item A')).toBeDefined()

    routeStore.set({ pathname: '/elsewhere', search: '' })
    await tick()
    flushSync()

    expect(screen.queryByText('Item A')).toBeNull()
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })
})

describe('Dropdown — width="trigger"', () => {
  it('sizes the menu from the trigger width measured at commit', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(180)
    renderHost(RenderTimeDropdownHost, { items, width: 'trigger' })

    screen.getByRole('button', { name: 'Actions' }).click()
    flushSync()

    expect(screen.getByRole('menu').style.width).toBe('180px')
  })
})

describe('PromptDialog — reopening', () => {
  it('seeds the input from the initialValue of the render that opens it', () => {
    const open = writable(true)
    const initialValue = writable('Sprint 4')
    renderHost(PromptDialogReopenHost, {
      open,
      initialValue,
      onClose: vi.fn<() => void>(),
      onSubmit: vi.fn<(value: string) => void>(),
      inputMolId: 'prompt-input',
    })
    const input = (): HTMLInputElement => {
      const el = screen.getByLabelText('Rename board', { selector: 'input' })
      if (!(el instanceof HTMLInputElement)) throw new TypeError('expected the prompt input')
      return el
    }
    expect(input().value).toBe('Sprint 4')

    // The user edits, then the dialog closes and the caller's value moves on.
    fireEvent.input(input(), { target: { value: 'Sprint 5' } })
    flushSync()
    expect(input().value).toBe('Sprint 5')
    open.set(false)
    initialValue.set('Sprint 5')
    flushSync()
    open.set(true)
    initialValue.set('Sprint 6')
    flushSync()

    expect(input().value).toBe('Sprint 6')
  })
})
