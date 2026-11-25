// @vitest-environment jsdom
/**
 * A click delivered as soon as the Switch commits still reaches `onChange`.
 *
 * The React reference guards a gap between the switch appearing and its
 * passive `useEffect` listener existing: a click in that gap toggled nothing.
 * Solid attaches its listener in `onMount`, which runs synchronously before
 * `render()` returns, so this port proves the same guarantee through the same
 * observation — a `MutationObserver` callback (a microtask right after the
 * commit) clicks the switch before any later macrotask. Same inputs, same
 * calls, same expected values as the reference; the re-render case uses a
 * Solid signal in place of React's `root.render`.
 *
 * @module
 */
import { fireEvent } from '@testing-library/dom'
import { createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ChangeEventHandler, MouseEventHandler } from '@molecule/app-ui'

vi.mock('@molecule/app-ui', () => {
  const FUNCTIONS = new Set(['switchBase', 'switchThumb'])
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'cn') {
        return (...parts: unknown[]) => parts.filter(Boolean).join(' ')
      }
      if (typeof prop === 'string' && FUNCTIONS.has(prop)) return () => prop
      return String(prop)
    },
  }
  return { getClassMap: () => new Proxy({}, handler) }
})

const { Switch } = await import('../components/Switch.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/**
 * Mounts a view into a fresh container appended to the document.
 *
 * @param view - The view to render.
 * @returns The container the view rendered into.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/** The rendered switch button. */
function switchOf(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>('[role="switch"]')
  if (!button) throw new Error('expected a rendered switch')
  return button
}

/**
 * Renders a view and clicks the switch as soon as it is in the DOM.
 *
 * @param view - The view to render.
 * @returns A promise settled once the click has been dispatched.
 */
function clickOnCommit(view: () => JSX.Element): Promise<void> {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const observer = new MutationObserver(() => {
      const button = container.querySelector<HTMLButtonElement>('[role="switch"]')
      if (!button) return
      observer.disconnect()
      fireEvent.click(button)
      resolve()
    })
    observer.observe(container, { childList: true, subtree: true })
    disposers.push(render(view, container))
  })
}

describe('Switch first click', () => {
  it('calls onChange for a click that lands before passive effects run', async () => {
    const onChange = vi.fn<ChangeEventHandler>()
    await clickOnCommit(() => <Switch checked={false} onChange={onChange} />)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].target).toBeInstanceOf(HTMLInputElement)
  })

  it('delivers the native change event and its checked target during activation', () => {
    const receive = vi.fn()
    const container = mount(() => (
      <Switch
        checked={false}
        onChange={(event) => {
          receive(
            event,
            event.target && 'checked' in event.target ? event.target.checked : undefined,
          )
        }}
      />
    ))
    fireEvent.click(switchOf(container))
    expect(receive).toHaveBeenCalledExactlyOnceWith(expect.any(Event), true)
    expect(receive.mock.calls[0]?.[0]).toHaveProperty('type', 'change')
  })

  it('calls the latest onChange after a re-render, once', () => {
    const first = vi.fn<ChangeEventHandler>()
    const second = vi.fn<ChangeEventHandler>()
    const [handler, setHandler] = createSignal<ChangeEventHandler>(first)
    const container = mount(() => <Switch checked={false} onChange={handler()} />)

    setHandler(() => second)
    fireEvent.click(switchOf(container))

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('still toggles when the caller passes an onClick, which runs first', () => {
    const onClick = vi.fn<MouseEventHandler>()
    const onChange = vi.fn<ChangeEventHandler>()
    const container = mount(() => <Switch checked={false} onChange={onChange} onClick={onClick} />)

    fireEvent.click(switchOf(container))

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onClick.mock.invocationCallOrder[0]).toBeLessThan(onChange.mock.invocationCallOrder[0])
  })

  it('does not toggle when the caller onClick prevents the default', () => {
    const onChange = vi.fn<ChangeEventHandler>()
    const container = mount(() => (
      <Switch
        checked={false}
        onChange={onChange}
        onClick={(event) => {
          event.preventDefault()
        }}
      />
    ))

    fireEvent.click(switchOf(container))

    expect(onChange).not.toHaveBeenCalled()
  })
})
