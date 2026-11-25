// @vitest-environment jsdom
/**
 * Tooltip hover coordination and viewport placement, mirroring
 * `@molecule/app-ui-react`'s `Tooltip.test.tsx` rendered with Solid.
 *
 * Solid listens for the bubbling `mouseover`/`mouseout` the way React's
 * `onMouseEnter`/`onMouseLeave` are built on, so the pointer moves below are the
 * same boundary crossings a user makes.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (actual) => ({
  ...(await actual<Record<string, unknown>>()),
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
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

import type { JSX } from 'solid-js'
import { createSignal, Show } from 'solid-js'
import { render } from 'solid-js/web'

const { Tooltip } = await import('../components/Tooltip.jsx')

const disposers: Array<() => void> = []

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.useRealTimers()
})

/** Mounts JSX with Solid's browser renderer and registers its disposer. */
function mount(jsx: () => JSX.Element): () => void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(jsx, container)
  disposers.push(dispose)
  return dispose
}

/** The visible tooltip elements, in document order. */
const tooltips = (): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>('[role="tooltip"]'),
]

/** The single visible tooltip; fails when none or several are rendered. */
const getTooltip = (): HTMLElement => {
  const found = tooltips()
  expect(found).toHaveLength(1)
  return found[0]
}

/** The button a user finds by its visible label. */
const button = (name: string): HTMLButtonElement => {
  const found = [...document.querySelectorAll('button')].find((el) => el.textContent === name)
  expect(found).toBeTruthy()
  return found as HTMLButtonElement
}

/** A pointer crossing INTO an element's boundary (native `mouseover`). */
const pointerEnter = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }))
}

/** A pointer crossing OUT of an element's boundary (native `mouseout`). */
const pointerLeave = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, cancelable: true }))
}

describe('tooltip hover interactions', () => {
  it('hands off immediately across toolbar buttons without leaving a tooltip trail', () => {
    mount(() => (
      <>
        {['Share', 'Report', 'Settings'].map((label) => (
          <Tooltip content={`${label} help`}>
            <button type="button">{label}</button>
          </Tooltip>
        ))}
      </>
    ))
    for (const label of ['Share', 'Report', 'Settings']) {
      const target = button(label)
      pointerEnter(target)
      expect(tooltips()).toHaveLength(1)
      expect(getTooltip().textContent).toBe(`${label} help`)
      pointerLeave(target)
      vi.advanceTimersByTime(25)
    }
    vi.advanceTimersByTime(150)
    expect(tooltips()).toHaveLength(0)
  })

  it('cancels another trigger’s pending show and replaces visible help even when the new tooltip is delayed', () => {
    mount(() => (
      <>
        <Tooltip content="Share help">
          <button type="button">Share</button>
        </Tooltip>
        <Tooltip content="Delayed settings" delay={300}>
          <button type="button">Settings</button>
        </Tooltip>
        <Tooltip content="Report help">
          <button type="button">Report</button>
        </Tooltip>
      </>
    ))
    pointerEnter(button('Share'))
    expect(getTooltip().textContent).toBe('Share help')
    pointerEnter(button('Settings'))
    expect(tooltips()).toHaveLength(0)
    vi.advanceTimersByTime(100)
    pointerEnter(button('Report'))
    vi.advanceTimersByTime(500)
    expect(tooltips()).toHaveLength(1)
    expect(getTooltip().textContent).toBe('Report help')
  })

  it('preserves the current owner when an older replaced tooltip unmounts', () => {
    const [first, setFirst] = createSignal(true)
    mount(() => (
      <>
        <Show when={first()}>
          <Tooltip content="Old help">
            <button type="button">Old</button>
          </Tooltip>
        </Show>
        <Tooltip content="Current help">
          <button type="button">Current</button>
        </Tooltip>
        <Tooltip content="Next help">
          <button type="button">Next</button>
        </Tooltip>
      </>
    ))
    pointerEnter(button('Old'))
    pointerEnter(button('Current'))
    setFirst(false)
    expect(getTooltip().textContent).toBe('Current help')
    pointerEnter(button('Next'))
    expect(tooltips()).toHaveLength(1)
    expect(getTooltip().textContent).toBe('Next help')
  })

  it('dismisses pointer-only hover with Escape while focus stays in another control', () => {
    mount(() => (
      <>
        <input aria-label="Composer" />
        <Tooltip content="Context summary">
          <button type="button">Context</button>
        </Tooltip>
      </>
    ))
    const composer = document.querySelector<HTMLInputElement>('input[aria-label="Composer"]')
    expect(composer).not.toBeNull()
    composer!.focus()
    pointerEnter(button('Context'))
    expect(getTooltip()).toBeTruthy()
    composer!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(tooltips()).toHaveLength(0)
    expect(document.activeElement).toBe(composer)
  })

  it('stays open when crossing the gap into tooltip content and closes after leaving both', () => {
    mount(() => (
      <Tooltip content="Context summary">
        <button type="button">Context</button>
      </Tooltip>
    ))
    const trigger = button('Context')
    pointerEnter(trigger)
    pointerLeave(trigger)
    vi.advanceTimersByTime(75)
    pointerEnter(getTooltip())
    vi.advanceTimersByTime(500)
    expect(getTooltip()).toBeTruthy()
    pointerLeave(getTooltip())
    vi.advanceTimersByTime(150)
    expect(tooltips()).toHaveLength(0)
  })

  it('cancels a pending delayed show when the pointer only passes over the trigger', () => {
    mount(() => (
      <Tooltip content="Context summary" delay={300}>
        <button type="button">Context</button>
      </Tooltip>
    ))
    const trigger = button('Context')
    pointerEnter(trigger)
    vi.advanceTimersByTime(100)
    pointerLeave(trigger)
    vi.advanceTimersByTime(1000)
    expect(tooltips()).toHaveLength(0)
  })

  it('clicks dismiss immediately and unmount clears pending timers', () => {
    const unmount = mount(() => (
      <Tooltip content="Context summary">
        <button type="button">Context</button>
      </Tooltip>
    ))
    const trigger = button('Context')
    pointerEnter(trigger)
    trigger.click()
    expect(tooltips()).toHaveLength(0)
    pointerEnter(trigger)
    pointerLeave(trigger)
    unmount()
    // A queued position update is a microtask, not a pending show/hide timer, so
    // anything the timer count still sees is a timeout the unmount leaked.
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps asynchronously expanded content anchored above its trigger', async () => {
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(800)
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1000)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const height =
        this.getAttribute('role') === 'tooltip' ? (this.textContent === 'Loading' ? 20 : 120) : 30
      return {
        top: 300,
        left: 300,
        width: 200,
        height,
        bottom: 300 + height,
        right: 500,
        x: 300,
        y: 300,
        toJSON: () => ({}),
      }
    })
    const [content, setContent] = createSignal('Loading')
    mount(() => (
      <Tooltip content={content()}>
        <button type="button">Context</button>
      </Tooltip>
    ))
    pointerEnter(button('Context'))
    await Promise.resolve()
    expect(getTooltip().parentElement?.style.top).toBe('272px')
    setContent('Loaded context and allowance details')
    await Promise.resolve()
    expect(getTooltip().parentElement?.style.top).toBe('172px')
  })
})
