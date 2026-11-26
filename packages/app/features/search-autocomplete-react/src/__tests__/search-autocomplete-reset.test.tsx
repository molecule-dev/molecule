// @vitest-environment jsdom

/**
 * The per-query reset, as in the other frameworks: a query that can search keeps
 * the previous query's suggestions until its own search answers, and text below
 * `minChars` drops them in the same render, so they never show for it nor come
 * back when the text grows again.
 *
 * @module
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SuggestionItem } from '../SearchAutocomplete.js'

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

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Input: (props: Record<string, unknown>) => createElement('input', props),
}))

const { SearchAutocomplete } = await import('../SearchAutocomplete.js')

afterEach(() => cleanup())

/** Deferred promise helper so a search can be held open across a query change. */
function defer<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

/**
 * A controlled harness so typing changes `value`.
 * @param props - Harness props.
 * @param props.onSearch - The async search fn under test.
 * @param props.minChars - Minimum chars before searching. Defaults to 1.
 * @returns The search input.
 */
function Harness({
  onSearch,
  minChars = 1,
}: {
  onSearch?: (q: string) => Promise<SuggestionItem[]>
  minChars?: number
}): ReturnType<typeof createElement> {
  const [value, setValue] = useState('')
  return createElement(SearchAutocomplete, {
    value,
    onChange: setValue,
    onSearch,
    onSelect: () => {},
    debounceMs: 0,
    minChars,
  })
}

describe('SearchAutocomplete per-query reset', () => {
  it("keeps the previous query's suggestions until the new query's search answers", async () => {
    const second = defer<SuggestionItem[]>()
    const onSearch = vi.fn((q: string) =>
      q === 'a' ? Promise.resolve([{ id: 'apple', label: 'Apple' }]) : second.promise,
    )
    render(createElement(Harness, { onSearch }))
    const input = screen.getByRole('combobox')

    // First query resolves and shows its suggestion.
    fireEvent.change(input, { target: { value: 'a' } })
    await waitFor(() => expect(screen.queryByText('Apple')).not.toBeNull())

    // Typing the next query keeps it while that query's search is pending.
    fireEvent.change(input, { target: { value: 'ab' } })
    expect(screen.queryByText('Apple')).not.toBeNull()

    // The new query is searched only after the debounce; resolve that one.
    await waitFor(() => expect(onSearch).toHaveBeenCalledWith('ab'))
    await act(async () => {
      second.resolve([{ id: 'banana', label: 'Banana' }])
    })
    await waitFor(() => expect(screen.queryByText('Banana')).not.toBeNull())
    expect(screen.queryByText('Apple')).toBeNull()
  })

  it('never shows stale suggestions below minChars', async () => {
    const onSearch = vi.fn((q: string): Promise<SuggestionItem[]> =>
      Promise.resolve(q === 'ab' ? [{ id: 'banana', label: 'Banana' }] : []),
    )
    render(createElement(Harness, { onSearch, minChars: 2 }))
    const input = screen.getByRole('combobox')

    fireEvent.change(input, { target: { value: 'ab' } })
    await waitFor(() => expect(screen.queryByText('Banana')).not.toBeNull())

    // Shrinking below the threshold hides the results without a new search.
    fireEvent.change(input, { target: { value: 'a' } })
    expect(screen.queryByText('Banana')).toBeNull()

    // Growing past it again does not bring the dropped results back: only the
    // new query's search can show suggestions.
    onSearch.mockImplementation(() => new Promise<SuggestionItem[]>(() => {}))
    fireEvent.change(input, { target: { value: 'ab' } })
    expect(screen.queryByText('Banana')).toBeNull()
  })
})
