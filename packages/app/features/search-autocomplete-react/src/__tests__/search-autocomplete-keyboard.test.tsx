// @vitest-environment jsdom

/**
 * The L115a fixes, exercised for real in jsdom:
 *   (a) full keyboard navigation — ArrowDown/ArrowUp move the highlight, Enter
 *       selects, Escape closes — with ARIA combobox/listbox/option roles and
 *       aria-activedescendant tracking the active option;
 *   (b) the stale-response race guard — an earlier `onSearch` that resolves
 *       AFTER a later one must NOT overwrite the fresher results.
 *
 * @module
 */

import {
  act,
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import type { ReactElement } from 'react'
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

// Forward every prop (onKeyDown, role, aria-*, value, onChange…) to a real
// <input> so the keyboard + ARIA wiring is testable end-to-end.
vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Input: (props: Record<string, unknown>) => createElement('input', props),
}))

const { SearchAutocomplete } = await import('../SearchAutocomplete.js')

afterEach(() => cleanup())

const suggestions: SuggestionItem[] = [
  { id: '1', label: 'One' },
  { id: '2', label: 'Two' },
  { id: '3', label: 'Three' },
]

/** Deferred promise helper for driving out-of-order resolution. */
function defer<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('SearchAutocomplete keyboard navigation (L115a-a)', () => {
  it('is a combobox that opens, moves the highlight, and selects with Enter', () => {
    const onSelect = vi.fn()
    render(
      createElement(SearchAutocomplete, {
        value: 'o',
        onChange: () => {},
        suggestions,
        onSelect,
      }),
    )
    const input = screen.getByRole('combobox')
    expect(input.getAttribute('aria-expanded')).toBe('false')

    // Focus opens the popover (value length >= minChars).
    fireEvent.focus(input)
    const listbox = screen.getByRole('listbox')
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(input.getAttribute('aria-controls')).toBe(listbox.getAttribute('id'))

    // ArrowDown highlights the first option; aria-activedescendant follows it.
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const options = screen.getAllByRole('option')
    expect(options[0].getAttribute('aria-selected')).toBe('true')
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0].getAttribute('id'))

    // A second ArrowDown moves to the second option; Enter selects it.
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.getAllByRole('option')[1].getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(suggestions[1])
  })

  it('wraps with ArrowUp and closes on Escape (no mouse involved)', () => {
    const onSelect = vi.fn()
    render(
      createElement(SearchAutocomplete, {
        value: 'o',
        onChange: () => {},
        suggestions,
        onSelect,
      }),
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)

    // ArrowUp from no-selection wraps to the LAST option.
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    const options = screen.getAllByRole('option')
    expect(options[options.length - 1].getAttribute('aria-selected')).toBe('true')

    // Escape closes the popover.
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(input.getAttribute('aria-expanded')).toBe('false')
  })

  it('Enter without a highlighted option does not select', () => {
    const onSelect = vi.fn()
    render(
      createElement(SearchAutocomplete, {
        value: 'o',
        onChange: () => {},
        suggestions,
        onSelect,
      }),
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('keeps aria-activedescendant valid when the list shrinks below the highlight', () => {
    const onSelect = vi.fn()
    const view = render(
      createElement(SearchAutocomplete, {
        value: 'o',
        onChange: () => {},
        suggestions,
        onSelect,
      }),
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.getAllByRole('option')[2].getAttribute('aria-selected')).toBe('true')

    // The list shrinks past the highlight: the old option id no longer exists,
    // so the combobox names no option instead of naming a gone one.
    view.rerender(
      createElement(SearchAutocomplete, {
        value: 'o',
        onChange: () => {},
        suggestions: suggestions.slice(0, 1),
        onSelect,
      }),
    )
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(input.getAttribute('aria-activedescendant')).toBeNull()
    expect(screen.getAllByRole('option')[0].getAttribute('aria-selected')).toBe('false')

    // Enter over a highlight that names nothing selects nothing.
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe('SearchAutocomplete option rows', () => {
  /**
   * Opens the popover over the static suggestion fixture.
   * @param onSelect - Selection callback spy.
   * @returns The rendered input element.
   */
  function renderOpen(onSelect: (item: SuggestionItem) => void): HTMLElement {
    render(
      createElement(SearchAutocomplete, { value: 'o', onChange: () => {}, suggestions, onSelect }),
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    return input
  }

  it('options hold no nested control and are never Tab stops', () => {
    renderOpen(vi.fn())
    for (const option of screen.getAllByRole('option')) {
      // An option's children are presentational: a button inside one is invisible
      // to assistive technology.
      expect(option.querySelector('button, a, input, [tabindex="0"]')).toBeNull()
      expect(option.getAttribute('tabindex')).toBe('-1')
    }
  })

  it('pressing a suggestion selects it, keeps focus on the input and closes the popover', () => {
    const onSelect = vi.fn()
    renderOpen(onSelect)
    const option = screen.getAllByRole('option')[1]
    const press = createEvent.mouseDown(option)
    fireEvent(option, press)
    expect(press.defaultPrevented).toBe(true)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(suggestions[1])
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})

/**
 * A controlled harness so typing changes `value`, driving the debounced
 * `onSearch` effect (needed to fire two out-of-order requests).
 * @param props - Harness props.
 * @param props.onSearch - The async search fn under test.
 * @param props.onSelect - Selection callback.
 */
function Harness({
  onSearch,
  onSelect,
}: {
  onSearch: (q: string) => Promise<SuggestionItem[]>
  onSelect: (item: SuggestionItem) => void
}): ReactElement {
  const [value, setValue] = useState('')
  return createElement(SearchAutocomplete, {
    value,
    onChange: setValue,
    onSearch,
    onSelect,
    debounceMs: 0,
    minChars: 1,
  })
}

describe('SearchAutocomplete stale-response race guard (L115a-b)', () => {
  it('ignores an earlier onSearch response that resolves after a later one', async () => {
    const first = defer<SuggestionItem[]>()
    const second = defer<SuggestionItem[]>()
    let calls = 0
    const onSearch = vi.fn((_q: string) => (++calls === 1 ? first.promise : second.promise))

    render(createElement(Harness, { onSearch, onSelect: () => {} }))
    const input = screen.getByRole('combobox')

    // Type "a" → first (slow) request fires.
    fireEvent.change(input, { target: { value: 'a' } })
    await waitFor(() => expect(onSearch).toHaveBeenCalledWith('a'))

    // Type "ab" → second (fast) request fires.
    fireEvent.change(input, { target: { value: 'ab' } })
    await waitFor(() => expect(onSearch).toHaveBeenCalledWith('ab'))

    // Resolve the LATER request first (fresh), then the earlier one out of order.
    await act(async () => {
      second.resolve([{ id: 'fresh', label: 'Fresh result' }])
    })
    await act(async () => {
      first.resolve([{ id: 'stale', label: 'Stale result' }])
    })

    // The fresh results stand; the stale out-of-order response is dropped.
    expect(screen.queryByText('Fresh result')).not.toBeNull()
    expect(screen.queryByText('Stale result')).toBeNull()
  })

  it('applies an in-order response normally', async () => {
    const only = defer<SuggestionItem[]>()
    const onSearch = vi.fn((_q: string) => only.promise)
    render(createElement(Harness, { onSearch, onSelect: () => {} }))
    const input = screen.getByRole('combobox')

    fireEvent.change(input, { target: { value: 'x' } })
    await waitFor(() => expect(onSearch).toHaveBeenCalledWith('x'))
    await act(async () => {
      only.resolve([{ id: 'ok', label: 'Only result' }])
    })
    expect(screen.queryByText('Only result')).not.toBeNull()
  })
})
