// @vitest-environment jsdom
/**
 * Vue port of `@molecule/app-ui-react/src/__tests__/render-time-state-adjustments.test.tsx`:
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
 * @module
 */
import { fireEvent, within } from '@testing-library/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A mutable location the mocked `useLocation` returns — tests advance it to
// simulate SPA navigation; Vue reactivity performs the re-render.
const { location } = await vi.hoisted(async () => {
  const { shallowRef } = await import('vue')
  return {
    location: shallowRef<{ pathname: string; search: string }>({ pathname: '/', search: '' }),
  }
})

vi.mock('@molecule/app-vue', () => ({
  useLocation: () => location,
  useTranslation: () => ({
    t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const CALLABLE = new Set([
      'modal',
      'stack',
      'flex',
      'sp',
      'textSize',
      'fontWeight',
      'input',
      'button',
      'label',
    ])
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (typeof prop === 'string' && CALLABLE.has(prop)) {
          return () => prop
        }
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { type App, createApp, defineComponent, h, nextTick, ref } from 'vue'

const { Dropdown } = await import('../components/Dropdown.js')
const { PromptDialog } = await import('../components/PromptDialog.js')

const items = [{ value: 'a', label: 'Item A' }]

const apps: App[] = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
  location.value = { pathname: '/', search: '' }
  vi.restoreAllMocks()
})

/**
 * Mounts a render function into a fresh host.
 *
 * @param render - The root component render.
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

/**
 * Mounts a Dropdown whose `open` is owned by the caller, like a controlled
 * consumer (React's `ControlledDropdown` with `open`/`onOpenChange` state).
 *
 * @param onOpenChange - Called with every reported open state.
 */
function mountControlledDropdown(onOpenChange: (open: boolean) => void): void {
  const Owner = defineComponent({
    name: 'ControlledDropdownOwner',
    setup() {
      const open = ref(false)
      return () =>
        h(Dropdown, {
          trigger: h('button', { type: 'button' }, 'Actions'),
          items,
          open: open.value,
          onOpenChange: (next: boolean) => {
            onOpenChange(next)
            open.value = next
          },
        })
    },
  })
  mount(() => h(Owner))
}

describe('Dropdown — controlled open closes on route change', () => {
  it('reports the close through onOpenChange instead of only resetting internally', async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>()
    mountControlledDropdown(onOpenChange)

    body().getByRole('button', { name: 'Actions' }).click()
    await nextTick()
    expect(body().getByText('Item A')).toBeDefined()

    location.value = { pathname: '/elsewhere', search: '' }
    await nextTick()

    expect(body().queryByText('Item A')).toBeNull()
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })
})

describe('Dropdown — width="trigger"', () => {
  it('sizes the menu from the trigger width measured at commit', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(180)
    mount(() =>
      h(Dropdown, {
        trigger: h('button', { type: 'button' }, 'Actions'),
        items,
        width: 'trigger',
      }),
    )

    body().getByRole('button', { name: 'Actions' }).click()
    await nextTick()

    expect(body().getByRole('menu').style.width).toBe('180px')
  })
})

describe('PromptDialog — reopening', () => {
  it('seeds the input from the initialValue of the render that opens it', async () => {
    const open = ref(true)
    const initialValue = ref('Sprint 4')
    const base = {
      onClose: vi.fn<() => void>(),
      title: 'Rename board',
      placeholder: 'Board name',
      onSubmit: vi.fn<(value: string) => void>(),
      inputMolId: 'prompt-input',
    }
    mount(() =>
      h(
        PromptDialog,
        { ...base, open: open.value, initialValue: initialValue.value },
        { default: () => null },
      ),
    )
    const input = (): HTMLInputElement => {
      const el = body().getByLabelText('Rename board', { selector: 'input' })
      if (!(el instanceof HTMLInputElement)) throw new TypeError('expected the prompt input')
      return el
    }
    expect(input().value).toBe('Sprint 4')

    // The user edits, then the dialog closes and the caller's value moves on.
    fireEvent.input(input(), { target: { value: 'Sprint 5' } })
    await nextTick()
    expect(input().value).toBe('Sprint 5')
    open.value = false
    initialValue.value = 'Sprint 5'
    await nextTick()
    open.value = true
    initialValue.value = 'Sprint 6'
    await nextTick()

    expect(input().value).toBe('Sprint 6')
  })
})
