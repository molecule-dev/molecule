// @vitest-environment jsdom
/**
 * Unit tests for the Vue `SearchAutocomplete` keyboard and data behavior — a
 * port of `@molecule/app-search-autocomplete-react`'s own suite: the same test
 * names and the same behavioral assertions (ARIA combobox wiring, the keyboard
 * highlight/select/close machine, pointer selection and the stale-response
 * race guard), rendered with Vue in jsdom.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// Forward every prop (onKeyDown, onFocus, onChange, role, aria-*, value…) to a
// real <input> so the keyboard and ARIA wiring is testable end-to-end, exactly
// like the React suite's `input` mock.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Input: defineComponent({
      name: 'Input',
      inheritAttrs: false,
      setup(_props, { attrs }) {
        const a = attrs as Record<string, unknown>
        return () =>
          h('input', {
            value: a.value,
            placeholder: a.placeholder,
            role: a.role,
            'aria-autocomplete': a['aria-autocomplete'],
            'aria-expanded': a['aria-expanded'],
            'aria-controls': a['aria-controls'],
            'aria-activedescendant': a['aria-activedescendant'],
            onFocusin: () => (a.onFocus as (() => void) | undefined)?.(),
            onKeydown: a.onKeyDown as ((event: KeyboardEvent) => void) | undefined,
            onInput: (event: Event) =>
              (a.onChange as ((event: Event) => void) | undefined)?.(event),
          })
      },
    }),
  }
})

import { createApp, defineComponent, h, nextTick, ref, type VNode } from 'vue'

import type { SuggestionItem } from '../types.js'

const { SearchAutocomplete } = await import('../SearchAutocomplete.js')

const apps: Array<ReturnType<typeof createApp>> = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  document.body.innerHTML = ''
  vi.useRealTimers()
})

/**
 * Mounts a component and returns its host element.
 * @param view - The root component to mount.
 * @returns The host element the app rendered into.
 */
const mountView = (view: unknown): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(view as never)
  app.mount(host)
  apps.push(app)
  return host
}

/**
 * Mounts a `SearchAutocomplete` with the given props.
 * @param props - The component props.
 * @returns The mounted host element and its input.
 */
const mount = (props: Record<string, unknown>): { host: HTMLElement; input: HTMLInputElement } => {
  const host = mountView(
    defineComponent({
      render: () =>
        h(SearchAutocomplete, {
          value: 'o',
          suggestions,
          onChange: () => {},
          onSelect: () => {},
          ...props,
        }),
    }),
  )
  const input = host.querySelector('input') as HTMLInputElement
  return { host, input }
}

/** The static suggestion fixture the React suite uses. */
const suggestions: SuggestionItem[] = [
  { id: '1', label: 'One' },
  { id: '2', label: 'Two' },
  { id: '3', label: 'Three' },
]

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

/** A deferred promise helper for driving out-of-order resolution. */
function defer<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

/**
 * A controlled harness so typing changes `value`, driving the debounced
 * `onSearch` effect (needed to fire two out-of-order requests).
 */
const Harness = defineComponent({
  props: {
    onSearch: { type: Function, required: true },
  },
  setup(props) {
    const value = ref('')
    return (): VNode =>
      h(SearchAutocomplete, {
        value: value.value,
        onChange: (next: string) => {
          value.value = next
        },
        onSearch: props.onSearch as (q: string) => Promise<SuggestionItem[]>,
        onSelect: () => {},
        debounceMs: 0,
        minChars: 1,
      })
  },
})

describe('SearchAutocomplete keyboard navigation', () => {
  it('is a combobox that opens, moves the highlight, and selects with Enter', async () => {
    const onSelect = vi.fn()
    const { host, input } = mount({ suggestions, onSelect })
    expect(input.getAttribute('aria-expanded')).toBe('false')

    focus(input)
    await nextTick()
    const listbox = host.querySelector('[role="listbox"]') as HTMLElement
    expect(listbox).not.toBeNull()
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(input.getAttribute('aria-controls')).toBe(listbox.getAttribute('id'))

    keydown(input, 'ArrowDown')
    await nextTick()
    let options = host.querySelectorAll('[role="option"]')
    expect(options[0]?.getAttribute('aria-selected')).toBe('true')
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0]?.getAttribute('id'))

    keydown(input, 'ArrowDown')
    await nextTick()
    options = host.querySelectorAll('[role="option"]')
    expect(options[1]?.getAttribute('aria-selected')).toBe('true')
    keydown(input, 'Enter')
    await nextTick()
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(suggestions[1])
  })

  it('wraps with ArrowUp and closes on Escape (no mouse involved)', async () => {
    const onSelect = vi.fn()
    const { host, input } = mount({ suggestions, onSelect })
    focus(input)
    await nextTick()

    keydown(input, 'ArrowUp')
    await nextTick()
    const options = host.querySelectorAll('[role="option"]')
    expect(options[options.length - 1]?.getAttribute('aria-selected')).toBe('true')

    keydown(input, 'Escape')
    await nextTick()
    expect(host.querySelector('[role="listbox"]')).toBeNull()
    expect(input.getAttribute('aria-expanded')).toBe('false')
  })

  it('Enter without a highlighted option does not select', async () => {
    const onSelect = vi.fn()
    const { input } = mount({ suggestions, onSelect })
    focus(input)
    await nextTick()
    keydown(input, 'Enter')
    await nextTick()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('keeps aria-activedescendant valid when the list shrinks below the highlight', async () => {
    const onSelect = vi.fn()
    const list = ref<SuggestionItem[]>(suggestions)
    const host = mountView(
      defineComponent({
        setup() {
          return () =>
            h(SearchAutocomplete, {
              value: 'o',
              suggestions: list.value,
              onChange: () => {},
              onSelect,
            })
        },
      }),
    )
    const input = host.querySelector('input') as HTMLInputElement
    focus(input)
    await nextTick()
    keydown(input, 'ArrowDown')
    await nextTick()
    keydown(input, 'ArrowDown')
    await nextTick()
    keydown(input, 'ArrowDown')
    await nextTick()
    expect(host.querySelectorAll('[role="option"]')[2]?.getAttribute('aria-selected')).toBe('true')

    // The list shrinks past the highlight: the old option id no longer exists,
    // so the combobox names no option instead of naming a gone one.
    list.value = suggestions.slice(0, 1)
    await nextTick()
    expect(host.querySelectorAll('[role="option"]')).toHaveLength(1)
    expect(input.getAttribute('aria-activedescendant')).toBeNull()
    expect(host.querySelectorAll('[role="option"]')[0]?.getAttribute('aria-selected')).toBe('false')

    // Enter over a highlight that names nothing selects nothing.
    keydown(input, 'Enter')
    await nextTick()
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
    const mounted = mount({ suggestions, onSelect })
    focus(mounted.input)
    return mounted
  }

  it('options hold no nested control and are never Tab stops', async () => {
    const { host } = renderOpen(vi.fn())
    await nextTick()
    for (const option of host.querySelectorAll('[role="option"]')) {
      expect(option.querySelector('button, a, input, [tabindex="0"]')).toBeNull()
      expect(option.getAttribute('tabindex')).toBe('-1')
    }
  })

  it('pressing a suggestion selects it, keeps focus on the input and closes the popover', async () => {
    const onSelect = vi.fn()
    const { host, input } = renderOpen(onSelect)
    await nextTick()
    const option = host.querySelectorAll('[role="option"]')[1] as HTMLElement
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    option.dispatchEvent(press)
    await nextTick()
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

    const host = mountView(
      defineComponent({
        render: () => h(Harness, { onSearch }),
      }),
    )
    const input = host.querySelector('input') as HTMLInputElement

    // Type "a" → first (slow) request fires.
    type(input, 'a')
    await vi.advanceTimersByTimeAsync(0)
    await nextTick()
    expect(onSearch).toHaveBeenCalledWith('a')

    // Type "ab" → second (fast) request fires.
    type(input, 'ab')
    await vi.advanceTimersByTimeAsync(0)
    await nextTick()
    expect(onSearch).toHaveBeenCalledWith('ab')

    // The EARLIER request resolves while the later one is still in flight: it
    // has lost the race and must be dropped.
    first.resolve([{ id: 'stale', label: 'Stale result' }])
    await vi.advanceTimersByTimeAsync(0)
    await nextTick()
    expect(host.textContent).not.toContain('Stale result')

    // The later (fresh) response applies.
    second.resolve([{ id: 'fresh', label: 'Fresh result' }])
    await vi.advanceTimersByTimeAsync(0)
    await nextTick()
    expect(host.textContent).toContain('Fresh result')
  })

  it('applies an in-order response normally', async () => {
    vi.useFakeTimers()
    const only = defer<SuggestionItem[]>()
    const onSearch = vi.fn((_query: string) => only.promise)

    const host = mountView(
      defineComponent({
        render: () => h(Harness, { onSearch }),
      }),
    )
    const input = host.querySelector('input') as HTMLInputElement

    type(input, 'x')
    await vi.advanceTimersByTimeAsync(0)
    await nextTick()
    expect(onSearch).toHaveBeenCalledWith('x')

    only.resolve([{ id: 'ok', label: 'Only result' }])
    await vi.advanceTimersByTimeAsync(0)
    await nextTick()
    expect(host.textContent).toContain('Only result')
  })
})
