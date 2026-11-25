// @vitest-environment jsdom
/**
 * Vue port of `@molecule/app-ui-react`'s `Tooltip` hover-interaction test:
 * one tooltip at a time, immediate hand-off between triggers, delayed shows,
 * Escape dismissal for pointer-only hover, the gap into the tooltip content,
 * and re-measuring when the content expands while visible.
 *
 * Rendered with real Vue. Vue listens for the bubbling `mouseover` / `mouseout`
 * (what crosses the wrapper's boundary) and re-derives React's synthetic
 * enter/leave from `relatedTarget`, so the events here are dispatched the same
 * way a real pointer produces them.
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
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

import { createApp, defineComponent, h, nextTick, ref, type RenderFunction } from 'vue'

const { Tooltip } = await import('../components/Tooltip.js')

it('places the tooltip in its scrolled trigger document and ignores Escape elsewhere', async () => {
  const frame = document.createElement('iframe')
  document.body.append(frame)
  const owner = frame.contentDocument
  const view = frame.contentWindow
  if (!owner || !view) throw new Error('Expected an iframe document')
  const host = owner.body.appendChild(owner.createElement('div'))
  Object.defineProperties(owner.documentElement, {
    clientWidth: { value: 120 },
    clientHeight: { value: 100 },
  })
  Object.defineProperties(view, { scrollX: { value: 20 }, scrollY: { value: 40 } })
  const app = createApp({
    render: () => h(Tooltip, { content: 'Frame tip' }, () => h('button', 'Help')),
  })
  app.mount(host)
  try {
    const anchor = host.querySelector('[role="presentation"]')
    if (!anchor) throw new Error('Expected the trigger wrapper')
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(new DOMRect(32, 50, 20, 10))
    mouseEnter(anchor)
    await nextTick()
    const tip = owner.body.querySelector('[role="tooltip"]')
    expect(tip).not.toBeNull()
    expect(tip?.parentElement?.getAttribute('style')).toMatch(/top: 82px/)
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(owner.body.querySelector('[role="tooltip"]')).toBe(tip)
    owner.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(owner.body.querySelector('[role="tooltip"]')).toBeNull()
  } finally {
    app.unmount()
    frame.remove()
  }
})

/** An element outside every trigger, standing in for the page around the tooltip. */
let outside: HTMLElement

/**
 * Mounts a render function into a fresh host, runs the assertions, unmounts.
 * @param render - The component render.
 * @param assert - The assertions.
 */
async function withMount(
  render: RenderFunction,
  assert: () => void | Promise<void>,
): Promise<void> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({ render })
  app.mount(host)
  try {
    await assert()
  } finally {
    app.unmount()
  }
}

/**
 * The buttons rendered by the tooltips, found by their visible label.
 * @param name - The button's text.
 * @returns The button element.
 */
function button(name: string): HTMLElement {
  const found = [...document.querySelectorAll<HTMLElement>('button')].find(
    (element) => element.textContent === name,
  )
  if (!found) throw new Error(`no button named ${name}`)
  return found
}

/** All currently rendered tooltips. */
const tooltips = (): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>('[role="tooltip"]'),
]

/** The currently rendered tooltip, or `null`. */
const tooltip = (): HTMLElement | null => document.querySelector<HTMLElement>('[role="tooltip"]')

/**
 * Moves the pointer into an element from outside every trigger.
 * @param element - The element the pointer enters.
 */
function mouseEnter(element: Element): void {
  element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: outside }))
}

/**
 * Moves the pointer out of an element to the page around it.
 * @param element - The element the pointer leaves.
 */
function mouseLeave(element: Element): void {
  element.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: outside }))
}

/**
 * Lets Vue flush scheduled updates, including the post-flush position watch.
 */
async function flush(): Promise<void> {
  await nextTick()
  await nextTick()
  await nextTick()
}

beforeEach(() => {
  outside = document.createElement('div')
  document.body.appendChild(outside)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('tooltip hover interactions', () => {
  it('hands off immediately across toolbar buttons without leaving a tooltip trail', async () => {
    await withMount(
      () =>
        h(
          'div',
          ['Share', 'Report', 'Settings'].map((label) =>
            h(Tooltip, { key: label, content: `${label} help` }, () =>
              h('button', { type: 'button' }, label),
            ),
          ),
        ),
      async () => {
        for (const label of ['Share', 'Report', 'Settings']) {
          const trigger = button(label)
          mouseEnter(trigger)
          await nextTick()
          expect(tooltips()).toHaveLength(1)
          expect(tooltip()!.textContent).toBe(`${label} help`)
          mouseLeave(trigger)
          vi.advanceTimersByTime(25)
        }
        vi.advanceTimersByTime(150)
        await nextTick()
        expect(tooltip()).toBeNull()
      },
    )
  })

  it('cancels another trigger’s pending show and replaces visible help even when the new tooltip is delayed', async () => {
    await withMount(
      () =>
        h('div', [
          h(Tooltip, { content: 'Share help' }, () => h('button', { type: 'button' }, 'Share')),
          h(Tooltip, { content: 'Delayed settings', delay: 300 }, () =>
            h('button', { type: 'button' }, 'Settings'),
          ),
          h(Tooltip, { content: 'Report help' }, () => h('button', { type: 'button' }, 'Report')),
        ]),
      async () => {
        mouseEnter(button('Share'))
        await nextTick()
        expect(tooltip()!.textContent).toBe('Share help')
        mouseEnter(button('Settings'))
        await nextTick()
        expect(tooltip()).toBeNull()
        vi.advanceTimersByTime(100)
        mouseEnter(button('Report'))
        await nextTick()
        vi.advanceTimersByTime(500)
        await nextTick()
        expect(tooltips()).toHaveLength(1)
        expect(tooltip()!.textContent).toBe('Report help')
      },
    )
  })

  it('preserves the current owner when an older replaced tooltip unmounts', async () => {
    const first = ref(true)
    const View = defineComponent({
      setup() {
        return () =>
          h('div', [
            first.value
              ? h(Tooltip, { content: 'Old help' }, () => h('button', { type: 'button' }, 'Old'))
              : null,
            h(Tooltip, { content: 'Current help' }, () =>
              h('button', { type: 'button' }, 'Current'),
            ),
            h(Tooltip, { content: 'Next help' }, () => h('button', { type: 'button' }, 'Next')),
          ])
      },
    })

    await withMount(
      () => h(View),
      async () => {
        mouseEnter(button('Old'))
        await nextTick()
        mouseEnter(button('Current'))
        await nextTick()
        first.value = false
        await flush()
        expect(tooltip()!.textContent).toBe('Current help')
        mouseEnter(button('Next'))
        await nextTick()
        expect(tooltips()).toHaveLength(1)
        expect(tooltip()!.textContent).toBe('Next help')
      },
    )
  })

  it('dismisses pointer-only hover with Escape while focus stays in another control', async () => {
    await withMount(
      () =>
        h('div', [
          h('input', { 'aria-label': 'Composer' }),
          h(Tooltip, { content: 'Context summary' }, () =>
            h('button', { type: 'button' }, 'Context'),
          ),
        ]),
      async () => {
        const composer = document.querySelector('input')!
        composer.focus()
        mouseEnter(button('Context'))
        await nextTick()
        expect(tooltip()).not.toBeNull()
        composer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        await nextTick()
        expect(tooltip()).toBeNull()
        expect(document.activeElement).toBe(composer)
      },
    )
  })

  it('stays open when crossing the gap into tooltip content and closes after leaving both', async () => {
    await withMount(
      () =>
        h(Tooltip, { content: 'Context summary' }, () =>
          h('button', { type: 'button' }, 'Context'),
        ),
      async () => {
        const trigger = button('Context')
        mouseEnter(trigger)
        await nextTick()
        mouseLeave(trigger)
        vi.advanceTimersByTime(75)
        mouseEnter(tooltip()!)
        vi.advanceTimersByTime(500)
        await nextTick()
        expect(tooltip()).not.toBeNull()
        mouseLeave(tooltip()!)
        vi.advanceTimersByTime(150)
        await nextTick()
        expect(tooltip()).toBeNull()
      },
    )
  })

  it('cancels a pending delayed show when the pointer only passes over the trigger', async () => {
    await withMount(
      () =>
        h(Tooltip, { content: 'Context summary', delay: 300 }, () =>
          h('button', { type: 'button' }, 'Context'),
        ),
      async () => {
        const trigger = button('Context')
        mouseEnter(trigger)
        vi.advanceTimersByTime(100)
        mouseLeave(trigger)
        vi.advanceTimersByTime(1000)
        await nextTick()
        expect(tooltip()).toBeNull()
      },
    )
  })

  it('clicks dismiss immediately and unmount clears pending timers', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp({
      render: () =>
        h(Tooltip, { content: 'Context summary' }, () =>
          h('button', { type: 'button' }, 'Context'),
        ),
    })
    app.mount(host)
    const trigger = button('Context')
    mouseEnter(trigger)
    await nextTick()
    trigger.click()
    await nextTick()
    expect(tooltip()).toBeNull()
    mouseEnter(trigger)
    mouseLeave(trigger)
    app.unmount()
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
    const content = ref('Loading')
    const View = defineComponent({
      setup() {
        return () =>
          h(Tooltip, { content: content.value }, () => h('button', { type: 'button' }, 'Context'))
      },
    })

    await withMount(
      () => h(View),
      async () => {
        mouseEnter(button('Context'))
        await flush()
        expect(tooltip()!.parentElement!.style.top).toBe('272px')
        content.value = 'Loaded context and allowance details'
        await flush()
        expect(tooltip()!.parentElement!.style.top).toBe('172px')
      },
    )
  })
})
