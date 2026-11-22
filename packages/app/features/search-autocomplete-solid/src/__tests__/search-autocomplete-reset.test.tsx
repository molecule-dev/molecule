// @vitest-environment jsdom

/**
 * The per-query reset, as in the other frameworks: a query that can search keeps
 * the previous query's suggestions until its own search answers, and text below
 * `minChars` drops them in the same update, so they never show for it nor come
 * back when the text grows again.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SuggestionItem } from '../types.js'

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

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// Forward every prop (role, aria-*, value, onChange…) to a real <input> so the
// typed text reaches the component's change handler, exactly like the React
// suite's `input` mock.
vi.mock('@molecule/app-ui-solid', () => ({
  Input: (props: {
    value?: string
    role?: 'combobox'
    'aria-autocomplete'?: 'list'
    'aria-expanded'?: boolean | 'true' | 'false'
    'aria-controls'?: string
    'aria-activedescendant'?: string
    onChange?: (event: Event) => void
  }) => (
    <input
      value={props.value}
      role={props.role}
      aria-autocomplete={props['aria-autocomplete']}
      aria-expanded={props['aria-expanded']}
      aria-controls={props['aria-controls']}
      aria-activedescendant={props['aria-activedescendant']}
      onInput={(event) => props.onChange?.(event)}
    />
  ),
}))

const { SearchAutocomplete } = await import('../SearchAutocomplete.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
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

/** Drains the microtasks Solid schedules its render effects in. */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

/**
 * A controlled harness so typing changes `value`.
 * @param props - Harness props.
 * @param props.onSearch - The async search fn under test.
 * @param props.minChars - Minimum chars before searching. Defaults to 1.
 * @returns The search input.
 */
function Harness(props: {
  onSearch: (query: string) => Promise<SuggestionItem[]>
  minChars?: number
}): JSX.Element {
  const [value, setValue] = createSignal('')
  return (
    <SearchAutocomplete
      value={value()}
      onChange={setValue}
      onSearch={props.onSearch}
      onSelect={() => {}}
      debounceMs={0}
      minChars={props.minChars ?? 1}
    />
  ) as JSX.Element
}

/**
 * Mounts a component and returns its host element.
 * @param view - The view function to render.
 * @returns The rendered container and its input.
 */
const mount = (view: () => JSX.Element): { host: HTMLElement; input: HTMLInputElement } => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  disposers.push(render(view, host))
  return { host, input: host.querySelector('input') as HTMLInputElement }
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

describe('SearchAutocomplete per-query reset', () => {
  it("keeps the previous query's suggestions until the new query's search answers", async () => {
    vi.useFakeTimers()
    const second = defer<SuggestionItem[]>()
    const onSearch = vi.fn<(q: string) => Promise<SuggestionItem[]>>((q) =>
      q === 'a' ? Promise.resolve([{ id: 'apple', label: 'Apple' }]) : second.promise,
    )
    const { host, input } = mount(() => (<Harness onSearch={onSearch} />) as JSX.Element)

    // First query resolves and shows its suggestion.
    type(input, 'a')
    await vi.advanceTimersByTimeAsync(0)
    await settle()
    expect(host.textContent).toContain('Apple')

    // Typing the next query keeps it while that query's search is pending.
    type(input, 'ab')
    await settle()
    expect(host.textContent).toContain('Apple')

    // The new query is searched only after the debounce; resolve that one.
    await vi.advanceTimersByTimeAsync(0)
    await settle()
    expect(onSearch).toHaveBeenCalledWith('ab')
    second.resolve([{ id: 'banana', label: 'Banana' }])
    await vi.advanceTimersByTimeAsync(0)
    await settle()
    expect(host.textContent).toContain('Banana')
    expect(host.textContent).not.toContain('Apple')
  })

  it('never shows stale suggestions below minChars', async () => {
    vi.useFakeTimers()
    const onSearch = vi.fn<(q: string) => Promise<SuggestionItem[]>>((q) =>
      Promise.resolve(q === 'ab' ? [{ id: 'banana', label: 'Banana' }] : []),
    )
    const { host, input } = mount(
      () => (<Harness onSearch={onSearch} minChars={2} />) as JSX.Element,
    )

    type(input, 'ab')
    await vi.advanceTimersByTimeAsync(0)
    await settle()
    expect(host.textContent).toContain('Banana')

    // Shrinking below the threshold hides the results without a new search.
    type(input, 'a')
    await settle()
    expect(host.textContent).not.toContain('Banana')

    // Growing past it again does not bring the dropped results back: only the
    // new query's search can show suggestions.
    onSearch.mockImplementation(() => new Promise<SuggestionItem[]>(() => {}))
    type(input, 'ab')
    await vi.advanceTimersByTimeAsync(0)
    await settle()
    expect(host.textContent).not.toContain('Banana')
  })
})
