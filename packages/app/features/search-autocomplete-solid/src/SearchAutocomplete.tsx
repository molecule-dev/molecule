/**
 * Solid search input with a typeahead suggestion popover.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'
import { createEffect, createSignal, createUniqueId, For, on, onCleanup, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import type { KitKeyboardEvent } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Input } from '@molecule/app-ui-solid'

import type { SearchAutocompleteProps, SuggestionItem } from './types.js'

/**
 * Renders a node value: a plain JSX value, or the accessor a conformance node
 * value arrives as inside a data prop (React keeps the node itself, so each
 * framework unwraps its own form).
 *
 * @param value - The node value.
 * @returns The JSX the node contributes.
 */
const nodeValue = (value: unknown): JSX.Element =>
  typeof value === 'function' ? (value as () => JSX.Element)() : (value as JSX.Element)

/**
 * Search input with a typeahead suggestions popover. Pass either
 * `onSearch` (async fetch with debounce) or `suggestions` (controlled).
 *
 * Solid counterpart of `@molecule/app-search-autocomplete-react`'s
 * `SearchAutocomplete` — the same props (React names), the same ClassMap
 * tokens, the same DOM for the same input, and the same callback calls.
 *
 * @param props - Component props (see {@link SearchAutocompleteProps}).
 * @returns The rendered search autocomplete.
 */
export const SearchAutocomplete: Component<SearchAutocompleteProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [internal, setInternal] = createSignal<SuggestionItem[]>([])
  const [open, setOpen] = createSignal(false)
  const [activeIndex, setActiveIndex] = createSignal(-1)
  /** The wrapper element the outside-mousedown check tests against. */
  let wrapper: HTMLDivElement | undefined
  // Monotonic id of the latest in-flight `onSearch`. A response only applies if
  // its token still equals the latest — the stale-response race guard.
  let request = 0
  const baseId = createUniqueId()
  const listId = `${baseId}-listbox`

  /**
   * Stable DOM id for the option at `index` (referenced by aria-activedescendant).
   * @param index - Option position.
   * @returns The option id.
   */
  const optionId = (index: number): string => `${baseId}-option-${index}`

  /** The suggestion list: the caller's controlled list wins over fetched results. */
  const list = (): SuggestionItem[] => props.suggestions ?? internal()

  /** The popover is only visible with open + at least one suggestion. */
  const isExpanded = (): boolean => open() && list().length > 0

  /**
   * The highlight clamped to the current list: a list that shrinks below the
   * highlighted index leaves the old option id pointing at nothing, so every
   * read of the index (activedescendant, the highlighted option, Enter) sees
   * -1 — nothing highlighted — instead of naming an option that is gone.
   *
   * @returns The active index, or -1 when nothing is highlighted.
   */
  const active = (): number => {
    const index = activeIndex()
    return index < list().length ? index : -1
  }

  /** React's `debounceMs = 200` default parameter. */
  const debounce = (): number => props.debounceMs ?? 200

  /** React's `minChars = 1` default parameter. */
  const minChars = (): number => props.minChars ?? 1

  // React's debounced `onSearch` effect: a new value/search/debounce/minChars
  // restarts the timer; a query shorter than minChars clears the results.
  createEffect(() => {
    const value = props.value
    const onSearch = props.onSearch
    const debounceMs = debounce()
    const threshold = minChars()
    if (!onSearch || value.length < threshold) {
      setInternal([])
      return
    }
    const timer = setTimeout(() => {
      const token = ++request
      Promise.resolve(onSearch(value))
        .then((result) => {
          // Drop a response that lost the race: only the LATEST request may
          // apply, so a slow earlier fetch can't clobber fresher results.
          if (token === request) setInternal(result)
        })
        .catch((_error) => {
          // Typeahead is best-effort — a failed suggestion fetch simply yields
          // no suggestions for THIS query. Guard on the token so an
          // out-of-order failure can't wipe a fresher successful result.
          if (token === request) setInternal([])
        })
    }, debounceMs)
    onCleanup(() => clearTimeout(timer))
  })

  // A new query resets the keyboard highlight (works for both the internal and
  // the controlled `suggestions` data modes).
  createEffect(
    on(
      () => props.value,
      () => setActiveIndex(-1),
    ),
  )

  // React's outside-mousedown effect: the listener exists only while open.
  createEffect(() => {
    if (!open()) return
    /**
     * Closes the dropdown when a click occurs outside the wrapper element.
     * @param event - The document mousedown.
     */
    const onDoc = (event: MouseEvent): void => {
      if (!wrapper?.contains(event.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', onDoc)
    onCleanup(() => document.removeEventListener('mousedown', onDoc))
  })

  /**
   * Commits a suggestion selection and closes the popover.
   * @param item - The chosen suggestion.
   */
  const select = (item: SuggestionItem): void => {
    props.onSelect?.(item)
    setOpen(false)
    setActiveIndex(-1)
  }

  /**
   * Full keyboard support for the combobox: ArrowDown/ArrowUp move the
   * highlight (opening the popover if needed), Enter selects the highlighted
   * option, Escape closes.
   * @param event - The keyboard event from the input.
   */
  const onKeyDown = (event: KitKeyboardEvent): void => {
    const current = list()
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open()) {
        if (current.length > 0) setOpen(true)
        return
      }
      if (current.length === 0) return
      setActiveIndex((index) => (index + 1) % current.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open()) {
        if (current.length > 0) setOpen(true)
        return
      }
      if (current.length === 0) return
      setActiveIndex((index) => (index <= 0 ? current.length - 1 : index - 1))
    } else if (event.key === 'Enter') {
      const index = active()
      if (isExpanded() && index >= 0) {
        event.preventDefault()
        select(current[index] as SuggestionItem)
      }
    } else if (event.key === 'Escape') {
      if (open()) {
        event.preventDefault()
        setOpen(false)
        setActiveIndex(-1)
      }
    }
  }

  return (
    <div
      ref={(element: HTMLDivElement) => {
        wrapper = element
      }}
      class={cm.cn(cm.position('relative'), props.className)}
    >
      <Input
        type="search"
        value={props.value}
        onChange={(event) => {
          props.onChange?.((event.target as HTMLInputElement).value)
          setOpen(true)
        }}
        onFocus={() => {
          if (props.value.length >= minChars()) setOpen(true)
        }}
        onKeyDown={onKeyDown}
        placeholder={props.placeholder ?? t('search.placeholder', {}, { defaultValue: 'Search…' })}
        role="combobox"
        aria-label={
          props.ariaLabel ?? t('search.aria.label', undefined, { defaultValue: 'Search' })
        }
        aria-autocomplete="list"
        aria-expanded={isExpanded()}
        aria-controls={listId}
        aria-activedescendant={isExpanded() && active() >= 0 ? optionId(active()) : undefined}
      />
      <Show when={isExpanded()}>
        <ul
          role="listbox"
          id={listId}
          class={cm.cn(cm.stack(0), cm.sp('p', 1))}
          style={{
            position: 'absolute',
            top: '100%',
            left: '0px',
            right: '0px',
            'z-index': '50',
            background: 'var(--color-surface, #fff)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            'border-radius': '8px',
            'box-shadow': '0 8px 24px rgba(0,0,0,0.12)',
            'max-height': '320px',
            'overflow-y': 'auto',
          }}
        >
          <For each={list()}>
            {(suggestion, index) => (
              <li
                id={optionId(index())}
                role="option"
                aria-selected={index() === active() ? 'true' : 'false'}
                tabindex={-1}
                data-mol-id="search-autocomplete-option"
                onMouseEnter={() => setActiveIndex(index())}
                // Pointer selection happens on press: preventDefault keeps DOM
                // focus on the input, which owns the combobox.
                onMouseDown={(event: MouseEvent) => {
                  event.preventDefault()
                  select(suggestion)
                }}
                class={cm.cn(
                  cm.sp('px', 2),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.cursorPointer,
                  index() === active() && cm.surfaceSecondary,
                )}
              >
                <div class={cm.fontWeight('medium')}>{nodeValue(suggestion.label)}</div>
                <Show when={suggestion.meta}>
                  <div class={cm.textSize('xs')}>{nodeValue(suggestion.meta)}</div>
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  )
}
