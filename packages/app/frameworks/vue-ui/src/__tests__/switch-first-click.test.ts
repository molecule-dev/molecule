// @vitest-environment jsdom
/**
 * Vue port of `@molecule/app-ui-react/src/__tests__/switch-first-click.test.tsx`:
 * a click that reaches the switch the moment it is in the DOM still reaches
 * `onChange`. React pins this against the gap before passive effects run; in
 * Vue the `change` listener is attached in `onMounted`, i.e. synchronously
 * inside the mount, so the equivalent observation is a click issued in the
 * same task as the mount (before any update flush) — plus the caller's
 * `onClick` ordering and veto, which are the same contract.
 *
 * @module
 */
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'
import { type App, createApp, h, nextTick, ref } from 'vue'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

const { Switch } = await import('../components/Switch.js')

const apps: App[] = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
})

/** The props the ported test renders on the switch. */
interface SwitchTestProps {
  checked: boolean
  onChange?: (event: Event) => void
  onClick?: (event: MouseEvent) => void
}

/**
 * Mounts a switch into a fresh host and returns its visible button.
 *
 * @param props - The switch props (a getter function so a test can re-render
 *   with new ones through Vue reactivity).
 * @returns The host element, the `[role="switch"]` button, and the app.
 */
function mountSwitch(props: () => SwitchTestProps): {
  host: HTMLElement
  button: HTMLButtonElement
  app: App
} {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  const app = createApp({ render: () => h(Switch, props()) })
  apps.push(app)
  app.mount(host)
  const button = host.querySelector<HTMLButtonElement>('[role="switch"]')
  if (!button) throw new Error('the switch does not render a [role="switch"] button')
  return { host, button, app }
}

describe('Switch first click', () => {
  it('calls onChange for a click that lands before passive effects run', () => {
    const onChange = vi.fn<(event: Event) => void>()
    const { button } = mountSwitch(() => ({ checked: false, onChange }))
    // No `await nextTick()`: the mount's `onMounted` listener is already
    // attached, exactly like React's layout-effect one at commit.
    button.click()
    expect(onChange).toHaveBeenCalledTimes(1)
    const event = onChange.mock.calls[0]?.[0]
    if (!(event instanceof Event)) throw new TypeError('expected a browser change event')
    expect(event.target).toBeInstanceOf(HTMLInputElement)
  })

  it('delivers the native change event and its checked target during activation', () => {
    const receive = vi.fn()
    const { button } = mountSwitch(() => ({
      checked: false,
      onChange: (event) => {
        receive(event, event.target && 'checked' in event.target ? event.target.checked : undefined)
      },
    }))
    button.click()
    expect(receive).toHaveBeenCalledExactlyOnceWith(expect.any(Event), true)
    expect(receive.mock.calls[0]?.[0]).toHaveProperty('type', 'change')
  })

  it('calls the latest onChange after a re-render, once', async () => {
    const first = vi.fn<(event: Event) => void>()
    const second = vi.fn<(event: Event) => void>()
    const onChange = ref<Mock<(event: Event) => void>>(first)
    const { button } = mountSwitch(() => ({ checked: false, onChange: onChange.value }))
    onChange.value = second
    await nextTick()
    button.click()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('still toggles when the caller passes an onClick, which runs first', async () => {
    const onClick = vi.fn<(event: MouseEvent) => void>()
    const onChange = vi.fn<(event: Event) => void>()
    const { button } = mountSwitch(() => ({ checked: false, onChange, onClick }))
    await nextTick()
    button.click()
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onClick.mock.invocationCallOrder[0]).toBeLessThan(onChange.mock.invocationCallOrder[0]!)
  })

  it('does not toggle when the caller onClick prevents the default', async () => {
    const onChange = vi.fn<(event: Event) => void>()
    const onClick = vi.fn<(event: MouseEvent) => void>((event) => event.preventDefault())
    const { button } = mountSwitch(() => ({ checked: false, onChange, onClick }))
    await nextTick()
    button.click()
    expect(onChange).not.toHaveBeenCalled()
  })
})
