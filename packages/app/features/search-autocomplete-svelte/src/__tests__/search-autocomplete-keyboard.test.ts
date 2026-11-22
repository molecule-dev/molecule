// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `SearchAutocomplete` keyboard and data behavior — a
 * port of `@molecule/app-search-autocomplete-react`'s own suite: the same test
 * names and the same behavioral assertions (ARIA combobox wiring, the keyboard
 * highlight/select/close machine, pointer selection and the stale-response
 * race guard), rendered with a real Svelte mount in jsdom.
 *
 * @module
 */

import { mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SuggestionItem } from '../types.js'

// Proxy ClassMap echoing each accessed member back as its token, exactly like
// the React suite's mock.
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
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import SearchAutocomplete from '../SearchAutocomplete.svelte'
import Harness from './Harness.svelte'
import ShrinkHarness from './ShrinkHarness.svelte'

/** The static suggestion fixture the React suite uses. */
const suggestions: SuggestionItem[] = [
  { id: '1', label: 'One' },
  { id: '2', label: 'Two' },
  { id: '3', label: 'Three' },
]

/** The mounted instances, torn down through the dispose closure `mount` gave. */
const mounted: Array<{ dispose: () => void; target: HTMLElement }> = []

afterEach(() => {
  for (const { dispose, target } of mounted.splice(0)) {
    dispose()
    target.remove()
  }
  vi.useRealTimers()
})

/**
 * Mounts a component with props.
 * @param component - The Svelte component.
 * @param props - Its props.
 * @returns The target element it rendered into.
 */
const mountWith = (component: unknown, props: Record<string, unknown>): HTMLElement => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(component as never, { target, props })
  mounted.push({
    target,
    dispose: () => {
      void unmount(instance)
    },
  })
  return target
}

/**
 * Mounts a `SearchAutocomplete` with the given props.
 * @param props - The component props.
 * @returns The target element and its input.
 */
const mountAutocomplete = (
  props: Record<string, unknown>,
): { host: HTMLElement; input: HTMLInputElement } => {
  const host = mountWith(SearchAutocomplete, {
    value: 'o',
    suggestions,
    onChange: () => {},
    onSelect: () => {},
    ...props,
  })
  return { host, input: host.querySelector('input') as HTMLInputElement }
}

/**
 * Focuses an input the way the conformance kit does (a bubbling focusin).
 * @param input - The input to focus.
 */
const focus = (input: HTMLInputElement): void => {
  input.focus()
  input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
}

/**
 * Dispatches one keydown on an element.
 * @param element - The target element.
 * @param key - The key name.
 */
const keydown = (element: Element, key: string): void => {
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

/**
 * Types a value into an input (sets the property, then fires `input`).
 * @param input - The input.
 * @param value - The typed value.
 */
const type = (input: HTMLInputElement, value: string): void => {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Drains the microtasks Svelte flushes its effects in. */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

/** A deferred promise helper for driving out-of-order resolution. */
function defer<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('SearchAutocomplete keyboard navigation', () => {
  it('is a combobox that opens, moves the highlight, and selects with Enter', async () => {
    const onSelect = vi.fn()
    const { host, input } = mountAutocomplete({ onSelect })
    expect(input.getAttribute('aria-expanded')).toBe('false')

    focus(input)
    await settle()
    const listbox = host.querySelector('[role="listbox"]') as HTMLElement
    expect(listbox).not.toBeNull()
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(input.getAttribute('aria-controls')).toBe(listbox.getAttribute('id'))

    keydown(input, 'ArrowDown')
    await settle()
    let options = host.querySelectorAll('[role="option"]')
    expect(options[0]?.getAttribute('aria-selected')).toBe('true')
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0]?.getAttribute('id'))

    keydown(input, 'ArrowDown')
    await settle()
    options = host.querySelectorAll('[role="option"]')
    expect(options[1]?.getAttribute('aria-selected')).toBe('true')
    keydown(input, 'Enter')
    await settle()
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(suggestions[1])
  })

  it('wraps with ArrowUp and closes on Escape (no mouse involved)', async () => {
    const { host, input } = mountAutocomplete({ onSelect: vi.fn() })
    focus(input)
    await settle()

    keydown(input, 'ArrowUp')
    await settle()
    const options = host.querySelectorAll('[role="option"]')
    expect(options[options.length - 1]?.getAttribute('aria-selected')).toBe('true')

    keydown(input, 'Escape')
    await settle()
    expect(host.querySelector('[role="listbox"]')).toBeNull()
    expect(input.getAttribute('aria-expanded')).toBe('false')
  })

  it('Enter without a highlighted option does not select', async () => {
    const onSelect = vi.fn()
    const { input } = mountAutocomplete({ onSelect })
    focus(input)
    await settle()
    keydown(input, 'Enter')
    await settle()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('keeps aria-activedescendant valid when the list shrinks below the highlight', async () => {
    const onSelect = vi.fn()
    const target = document.createElement('div')
    document.body.appendChild(target)
    const harness = mount(ShrinkHarness, {
      target,
      props: { onSelect },
    })
    mounted.push({
      target,
      dispose: () => {
        void unmount(harness)
      },
    })
    const host = target
    const input = host.querySelector('input') as HTMLInputElement
    focus(input)
    await settle()
    keydown(input, 'ArrowDown')
    await settle()
    keydown(input, 'ArrowDown')
    await settle()
    keydown(input, 'ArrowDown')
    await settle()
    expect(host.querySelectorAll('[role="option"]')[2]?.getAttribute('aria-selected')).toBe('true')

    // The list shrinks past the highlight: the old option id no longer exists,
    // so the combobox names no option instead of naming a gone one.
    harness.shrinkTo(1)
    await settle()
    expect(host.querySelectorAll('[role="option"]')).toHaveLength(1)
    expect(input.getAttribute('aria-activedescendant')).toBeNull()
    expect(host.querySelectorAll('[role="option"]')[0]?.getAttribute('aria-selected')).toBe('false')

    // Enter over a highlight that names nothing selects nothing.
    keydown(input, 'Enter')
    await settle()
    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe('SearchAutocomplete option rows', () => {
  /**
   * Opens the popover over the static suggestion fixture.
   * @param onSelect - Selection callback spy.
   * @returns The rendered host and input.
   */
  const renderOpen = (
    onSelect: (item: SuggestionItem) => void,
  ): { host: HTMLElement; input: HTMLInputElement } => {
    const rendered = mountAutocomplete({ onSelect })
    focus(rendered.input)
    return rendered
  }

  it('options hold no nested control and are never Tab stops', async () => {
    const { host } = renderOpen(vi.fn())
    await settle()
    for (const option of host.querySelectorAll('[role="option"]')) {
      expect(option.querySelector('button, a, input, [tabindex="0"]')).toBeNull()
      expect(option.getAttribute('tabindex')).toBe('-1')
    }
  })

  it('pressing a suggestion selects it, keeps focus on the input and closes the popover', async () => {
    const onSelect = vi.fn()
    const { host, input } = renderOpen(onSelect)
    await settle()
    const option = host.querySelectorAll('[role="option"]')[1] as HTMLElement
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    option.dispatchEvent(press)
    await settle()
    expect(press.defaultPrevented).toBe(true)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(suggestions[1])
    expect(host.querySelector('[role="listbox"]')).toBeNull()
    expect(document.activeElement).toBe(input)
  })
})

describe('SearchAutocomplete stale-response race guard', () => {
  it('ignores an earlier onSearch response that resolves after a later one', async () => {
    vi.useFakeTimers()
    const first = defer<SuggestionItem[]>()
    const second = defer<SuggestionItem[]>()
    let calls = 0
    const onSearch = vi.fn((_query: string) => (++calls === 1 ? first.promise : second.promise))

    const host = mountWith(Harness, { onSearch })
    const input = host.querySelector('input') as HTMLInputElement

    type(input, 'a')
    await vi.advanceTimersByTimeAsync(0)
    await settle()
    expect(onSearch).toHaveBeenCalledWith('a')

    type(input, 'ab')
    await vi.advanceTimersByTimeAsync(0)
    await settle()
    expect(onSearch).toHaveBeenCalledWith('ab')

    // The EARLIER request resolves while the later one is still in flight: it
    // has lost the race and must be dropped.
    first.resolve([{ id: 'stale', label: 'Stale result' }])
    await vi.advanceTimersByTimeAsync(0)
    await settle()
    expect(host.textContent).not.toContain('Stale result')

    second.resolve([{ id: 'fresh', label: 'Fresh result' }])
    await vi.advanceTimersByTimeAsync(0)
    await settle()
    expect(host.textContent).toContain('Fresh result')
  })

  it('applies an in-order response normally', async () => {
    vi.useFakeTimers()
    const only = defer<SuggestionItem[]>()
    const onSearch = vi.fn((_query: string) => only.promise)

    const host = mountWith(Harness, { onSearch })
    const input = host.querySelector('input') as HTMLInputElement

    type(input, 'x')
    await vi.advanceTimersByTimeAsync(0)
    await settle()
    expect(onSearch).toHaveBeenCalledWith('x')

    only.resolve([{ id: 'ok', label: 'Only result' }])
    await vi.advanceTimersByTimeAsync(0)
    await settle()
    expect(host.textContent).toContain('Only result')
  })
})
