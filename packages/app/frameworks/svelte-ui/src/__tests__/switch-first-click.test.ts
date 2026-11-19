// @vitest-environment jsdom
/**
 * Svelte port of `@molecule/app-ui-react/src/__tests__/switch-first-click.test.tsx`:
 * a click that reaches the switch the moment it is in the DOM still reaches
 * `onChange`. React pins this against the gap before passive effects run; the
 * Svelte component attaches its listener in `$effect.pre` (before the DOM
 * paint), so the equivalent observation is a click issued in the same task as
 * the mount, with no flush in between — plus the caller's `onClick` ordering
 * and veto, which are the same contract.
 *
 * @module
 */
import { flushSync, mount, unmount } from 'svelte'
import { type Writable, writable } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

const { default: SwitchFirstClickHost } = await import('./SwitchFirstClickHost.svelte')

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
})

/**
 * Mounts the switch host into a fresh container and returns its visible
 * button.
 *
 * @param onChange - The store carrying the caller's change handler.
 * @param onClick - The store carrying the caller's click handler.
 * @returns The host element and the `[role="switch"]` button.
 */
function mountSwitch(
  onChange: Writable<(event: Event) => void>,
  onClick?: Writable<(event: MouseEvent) => void>,
): { host: HTMLElement; button: HTMLButtonElement } {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(
    mount(SwitchFirstClickHost, {
      target: host,
      props: { checked: writable(false), onChange, onClick },
    }),
  )
  const button = host.querySelector<HTMLButtonElement>('[role="switch"]')
  if (!button) throw new Error('the switch does not render a [role="switch"] button')
  return { host, button }
}

describe('Switch first click', () => {
  it('calls onChange for a click that lands before passive effects run', () => {
    const onChange = vi.fn<(event: Event) => void>()
    const { button } = mountSwitch(writable(onChange))
    // No flush: the pre-effect listener is already attached at mount, exactly
    // like React's layout-effect one at commit.
    button.click()
    expect(onChange).toHaveBeenCalledTimes(1)
    const event = onChange.mock.calls[0]?.[0]
    if (!(event instanceof Event)) throw new TypeError('expected a browser change event')
    expect(event.target).toBeInstanceOf(HTMLInputElement)
  })

  it('calls the latest onChange after a re-render, once', () => {
    const first = vi.fn<(event: Event) => void>()
    const second = vi.fn<(event: Event) => void>()
    const onChange = writable(first)
    const { button } = mountSwitch(onChange)
    onChange.set(second)
    flushSync()
    button.click()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('still toggles when the caller passes an onClick, which runs first', () => {
    const onClick = vi.fn<(event: MouseEvent) => void>()
    const onChange = vi.fn<(event: Event) => void>()
    const { button } = mountSwitch(writable(onChange), writable(onClick))
    flushSync()
    button.click()
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onClick.mock.invocationCallOrder[0]).toBeLessThan(onChange.mock.invocationCallOrder[0]!)
  })

  it('does not toggle when the caller onClick prevents the default', () => {
    const onChange = vi.fn<(event: Event) => void>()
    const onClick = vi.fn<(event: MouseEvent) => void>((event) => event.preventDefault())
    const { button } = mountSwitch(writable(onChange), writable(onClick))
    flushSync()
    button.click()
    expect(onChange).not.toHaveBeenCalled()
  })
})
