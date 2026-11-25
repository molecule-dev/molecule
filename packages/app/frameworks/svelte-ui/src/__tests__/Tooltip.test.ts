// @vitest-environment jsdom
/**
 * Tooltip hover/focus interactions, ported from
 * `@molecule/app-ui-react/src/__tests__/Tooltip.test.tsx`: the placed box must
 * hand off between triggers without a trail, cancel a pending delayed show,
 * survive crossing the gap into its own content, dismiss on Escape and click,
 * and re-anchor when its content grows after it is already open.
 *
 * React derives `onMouseEnter`/`onMouseLeave` from the bubbling
 * `mouseover`/`mouseout` events; the Svelte component listens for those same
 * bubbling events, so the tests dispatch them directly.
 *
 * @module
 */
import { screen } from '@testing-library/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// getClassMap() → a Proxy: `cn(...)` joins truthy strings, every other access
// yields a callable that stringifies to its key.
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
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

import { type Component, createRawSnippet, flushSync, mount, unmount } from 'svelte'

const { default: Tooltip } = await import('../components/Tooltip.svelte')
const { default: TooltipHost } = await import('./TooltipHost.svelte')

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
  vi.useRealTimers()
})

beforeEach(() => {
  vi.useFakeTimers()
})

/**
 * Mounts one Tooltip wrapping the given trigger markup into a fresh host.
 *
 * @param content - The tooltip text.
 * @param childrenMarkup - The single trigger element, as raw HTML.
 * @param props - Extra Tooltip props (delay, placement).
 */
function mountTooltip(
  content: string,
  childrenMarkup: string,
  props: { delay?: number } = {},
): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  const children = createRawSnippet(() => ({ render: () => childrenMarkup }))
  mounted.push(
    mount(Tooltip as Component<Record<string, unknown>>, {
      target: host,
      props: { content, children, ...props },
    }),
  )
}

/** Dispatches the bubbling event React derives `onMouseEnter` from. */
const pointerOver = (el: Element): void => {
  flushSync(() => {
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  })
}

/** Dispatches the bubbling event React derives `onMouseLeave` from. */
const pointerOut = (el: Element): void => {
  flushSync(() => {
    el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  })
}

/** Enters the positioned tooltip wrapper (the box's parent). */
const enterTooltipBox = (el: Element): void => {
  flushSync(() => {
    el.dispatchEvent(new MouseEvent('mouseenter'))
  })
}

/** Leaves the positioned tooltip wrapper. */
const leaveTooltipBox = (el: Element): void => {
  flushSync(() => {
    el.dispatchEvent(new MouseEvent('mouseleave'))
  })
}

/** Advances fake time and flushes the resulting component update. */
const advance = (ms: number): void => {
  flushSync(() => {
    vi.advanceTimersByTime(ms)
  })
}

/** The native button with the given accessible name. */
const button = (name: string): HTMLButtonElement =>
  screen.getByRole('button', { name }) as HTMLButtonElement

describe('tooltip hover interactions', () => {
  it('hands off immediately across toolbar buttons without leaving a tooltip trail', () => {
    for (const label of ['Share', 'Report', 'Settings']) {
      mountTooltip(`${label} help`, `<button type="button">${label}</button>`)
    }
    for (const label of ['Share', 'Report', 'Settings']) {
      pointerOver(button(label))
      expect(screen.getAllByRole('tooltip')).toHaveLength(1)
      expect(screen.getByRole('tooltip').textContent).toBe(`${label} help`)
      pointerOut(button(label))
      advance(25)
    }
    advance(150)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('cancels another trigger’s pending show and replaces visible help even when the new tooltip is delayed', () => {
    mountTooltip('Share help', '<button type="button">Share</button>')
    mountTooltip('Delayed settings', '<button type="button">Settings</button>', { delay: 300 })
    mountTooltip('Report help', '<button type="button">Report</button>')

    pointerOver(button('Share'))
    expect(screen.getByRole('tooltip').textContent).toBe('Share help')
    pointerOver(button('Settings'))
    expect(screen.queryByRole('tooltip')).toBeNull()
    advance(100)
    pointerOver(button('Report'))
    advance(500)
    expect(screen.getAllByRole('tooltip')).toHaveLength(1)
    expect(screen.getByRole('tooltip').textContent).toBe('Report help')
  })

  it('preserves the current owner when an older replaced tooltip unmounts', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    hosts.push(host)
    mounted.push(
      mount(TooltipHost as Component<{ mode: 'replace' }>, {
        target: host,
        props: { mode: 'replace' },
      }),
    )

    pointerOver(button('Old'))
    pointerOver(button('Current'))
    flushSync(() => {
      ;(document.querySelector('[data-action="remove-old"]') as HTMLButtonElement).click()
    })
    expect(screen.getByRole('tooltip').textContent).toBe('Current help')
    pointerOver(button('Next'))
    expect(screen.getAllByRole('tooltip')).toHaveLength(1)
    expect(screen.getByRole('tooltip').textContent).toBe('Next help')
  })

  it('dismisses pointer-only hover with Escape while focus stays in another control', () => {
    const input = document.createElement('input')
    input.setAttribute('aria-label', 'Composer')
    document.body.appendChild(input)
    mountTooltip('Context summary', '<button type="button">Context</button>')

    const composer = screen.getByRole('textbox')
    flushSync(() => composer.focus())
    pointerOver(button('Context'))
    expect(screen.getByRole('tooltip')).toBeTruthy()
    flushSync(() => {
      composer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(document.activeElement).toBe(composer)
  })

  it('stays open when crossing the gap into tooltip content and closes after leaving both', () => {
    mountTooltip('Context summary', '<button type="button">Context</button>')

    pointerOver(button('Context'))
    pointerOut(button('Context'))
    advance(75)
    const box = screen.getByRole('tooltip').parentElement as HTMLElement
    enterTooltipBox(box)
    advance(500)
    expect(screen.getByRole('tooltip')).toBeTruthy()
    leaveTooltipBox(box)
    advance(150)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('cancels a pending delayed show when the pointer only passes over the trigger', () => {
    mountTooltip('Context summary', '<button type="button">Context</button>', { delay: 300 })

    pointerOver(button('Context'))
    advance(100)
    pointerOut(button('Context'))
    advance(1000)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('clicks dismiss immediately and unmount clears pending timers', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    hosts.push(host)
    const children = createRawSnippet(() => ({
      render: () => '<button type="button">Context</button>',
    }))
    const instance = mount(Tooltip as Component<Record<string, unknown>>, {
      target: host,
      props: { content: 'Context summary', children },
    })

    pointerOver(button('Context'))
    flushSync(() => button('Context').click())
    expect(screen.queryByRole('tooltip')).toBeNull()
    pointerOver(button('Context'))
    pointerOut(button('Context'))
    unmount(instance)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps asynchronously expanded content anchored above its trigger', () => {
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
    const host = document.createElement('div')
    document.body.appendChild(host)
    hosts.push(host)
    mounted.push(
      mount(TooltipHost as Component<{ mode: 'expand' }>, {
        target: host,
        props: { mode: 'expand' },
      }),
    )

    pointerOver(button('Context'))
    expect(screen.getByRole('tooltip').parentElement?.style.top).toBe('272px')
    flushSync(() => {
      ;(document.querySelector('[data-action="expand"]') as HTMLButtonElement).click()
    })
    expect(screen.getByRole('tooltip').parentElement?.style.top).toBe('172px')
    vi.restoreAllMocks()
  })
})
