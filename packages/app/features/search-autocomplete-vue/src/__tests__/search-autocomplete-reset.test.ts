// @vitest-environment jsdom

/**
 * The per-query reset, as in the other frameworks: a query that can search keeps
 * the previous query's suggestions until its own search answers, and text below
 * `minChars` drops them in the same update, so they never show for it nor come
 * back when the text grows again.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

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

// Forward every prop (role, aria-*, value, onChange…) to a real <input> so the
// typed text reaches the component's change handler, exactly like the React
// suite's `input` mock.
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
            role: a.role,
            'aria-autocomplete': a['aria-autocomplete'],
            'aria-expanded': a['aria-expanded'],
            'aria-controls': a['aria-controls'],
            'aria-activedescendant': a['aria-activedescendant'],
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

/** Deferred promise helper so a search can be held open across a query change. */
function defer<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

/**
 * Mounts a root component and returns its host element.
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
 * A controlled harness so typing changes `value`.
 * @param props - Harness props.
 * @param props.onSearch - The async search fn under test.
 * @param props.minChars - Minimum chars before searching. Defaults to 1.
 * @returns The search input.
 */
const Harness = defineComponent({
  props: {
    onSearch: { type: Function, required: true },
    minChars: { type: Number, default: 1 },
  },
  setup(props) {
    const value = ref('')
    return (): VNode =>
      h(SearchAutocomplete, {
        value: value.value,
        onChange: (next: string) => {
          value.value = next
        },
        onSearch: props.onSearch as (query: string) => Promise<SuggestionItem[]>,
        onSelect: () => {},
        debounceMs: 0,
        minChars: props.minChars,
      })
  },
})

/**
 * Types a value into an input (sets the property, then fires `input`).
 * @param input - The input.
 * @param value - The typed value.
 */
const type = (input: HTMLInputElement, value: string): void => {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('SearchAutocomplete per-query reset', () => {
  it("keeps the previous query's suggestions until the new query's search answers", async () => {
    vi.useFakeTimers()
    const second = defer<SuggestionItem[]>()
    const onSearch = vi.fn<(q: string) => Promise<SuggestionItem[]>>((q) =>
      q === 'a' ? Promise.resolve([{ id: 'apple', label: 'Apple' }]) : second.promise,
    )
    const host = mountView(
      defineComponent({
        render: () => h(Harness, { onSearch }),
      }),
    )
    const input = host.querySelector('input') as HTMLInputElement

    // First query resolves and shows its suggestion.
    type(input, 'a')
    await vi.advanceTimersByTimeAsync(0)
    await nextTick()
    expect(host.textContent).toContain('Apple')

    // Typing the next query keeps it while that query's search is pending.
    type(input, 'ab')
    await nextTick()
    expect(host.textContent).toContain('Apple')

    // The new query is searched only after the debounce; resolve that one.
    await vi.advanceTimersByTimeAsync(0)
    await nextTick()
    expect(onSearch).toHaveBeenCalledWith('ab')
    second.resolve([{ id: 'banana', label: 'Banana' }])
    await vi.advanceTimersByTimeAsync(0)
    await nextTick()
    expect(host.textContent).toContain('Banana')
    expect(host.textContent).not.toContain('Apple')
  })

  it('never shows stale suggestions below minChars', async () => {
    vi.useFakeTimers()
    const onSearch = vi.fn<(q: string) => Promise<SuggestionItem[]>>((q) =>
      Promise.resolve(q === 'ab' ? [{ id: 'banana', label: 'Banana' }] : []),
    )
    const host = mountView(
      defineComponent({
        render: () => h(Harness, { onSearch, minChars: 2 }),
      }),
    )
    const input = host.querySelector('input') as HTMLInputElement

    type(input, 'ab')
    await vi.advanceTimersByTimeAsync(0)
    await nextTick()
    expect(host.textContent).toContain('Banana')

    // Shrinking below the threshold hides the results without a new search.
    type(input, 'a')
    await nextTick()
    expect(host.textContent).not.toContain('Banana')

    // Growing past it again does not bring the dropped results back: only the
    // new query's search can show suggestions.
    onSearch.mockImplementation(() => new Promise<SuggestionItem[]>(() => {}))
    type(input, 'ab')
    await vi.advanceTimersByTimeAsync(0)
    await nextTick()
    expect(host.textContent).not.toContain('Banana')
  })
})
