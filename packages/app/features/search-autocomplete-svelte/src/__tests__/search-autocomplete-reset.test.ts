// @vitest-environment jsdom

/**
 * The per-query reset, as in the other frameworks: a query that can search keeps
 * the previous query's suggestions until its own search answers, and text below
 * `minChars` drops them in the same update, so they never show for it nor come
 * back when the text grows again.
 *
 * @module
 */

import { mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SuggestionItem } from '../types.js'

// The kit's Input, Select and Textarea read `fieldLayout` from this module, so the actual module
// stays and only the ClassMap is replaced.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

import ResetHarness from './ResetHarness.svelte'

/** The mounted instances, torn down through the dispose closure `mount` gave. */
const mounted: Array<{ dispose: () => void; target: HTMLElement }> = []

afterEach(() => {
  for (const { dispose, target } of mounted.splice(0)) {
    dispose()
    target.remove()
  }
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
 * Mounts the controlled harness.
 * @param props - The harness props.
 * @returns The target element and its input.
 */
const mountHarness = (
  props: Record<string, unknown>,
): { host: HTMLElement; input: HTMLInputElement } => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(ResetHarness as never, { target, props })
  mounted.push({
    target,
    dispose: () => {
      void unmount(instance)
    },
  })
  return { host: target, input: target.querySelector('input') as HTMLInputElement }
}

/** Drains the microtasks Svelte flushes its effects in. */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
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
    const { host, input } = mountHarness({ onSearch })

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
    const { host, input } = mountHarness({ onSearch, minChars: 2 })

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
