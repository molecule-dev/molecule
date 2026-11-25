import type { JSX, ReactNode } from 'react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import type { KitKeyboardEvent } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Input } from '@molecule/app-ui-react'
import { Box, Pressable, ScrollArea } from '@molecule/app-ui-react/elements'

/**
 * A single suggestion entry returned by `onSearch` or passed via `suggestions`.
 */
export interface SuggestionItem<T = unknown> {
  id: string
  label: ReactNode
  /** Optional secondary line / category. */
  meta?: ReactNode
  /** Original payload for the selection callback. */
  data?: T
}

/** Props accepted by the {@link SearchAutocomplete} component. */
export interface SearchAutocompleteProps<T = unknown> {
  /** Current input value. */
  value: string
  /** Called whenever the input changes. */
  onChange: (value: string) => void
  /** Async search function — receives the query, returns suggestions. */
  onSearch?: (query: string) => Promise<SuggestionItem<T>[]> | SuggestionItem<T>[]
  /** Optional pre-computed suggestion list (when caller controls fetching). */
  suggestions?: SuggestionItem<T>[]
  /** Called when the user picks a suggestion. */
  onSelect: (item: SuggestionItem<T>) => void
  /** Placeholder. */
  placeholder?: string
  /**
   * Accessible name for the input, rendered as `aria-label`. Defaults to the
   * translated `search.aria.label`: a placeholder is not a label, so an input
   * named only by its placeholder (let alone an empty one) is nameless for
   * assistive technology.
   */
  ariaLabel?: string
  /** Debounce ms for `onSearch`. Defaults to 200. */
  debounceMs?: number
  /** Min chars before suggestions appear. Defaults to 1. */
  minChars?: number
  /** Extra classes on the wrapper. */
  className?: string
}

/**
 * Search input with a typeahead suggestions popover. Pass either
 * `onSearch` (async fetch with debounce) or `suggestions` (controlled).
 * @param props - Component props (see {@link SearchAutocompleteProps}).
 */
export function SearchAutocomplete<T = unknown>({
  value,
  onChange,
  onSearch,
  suggestions: controlledSuggestions,
  onSelect,
  placeholder,
  ariaLabel,
  debounceMs = 200,
  minChars = 1,
  className,
}: SearchAutocompleteProps<T>): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [internal, setInternal] = useState<SuggestionItem<T>[]>([])
  const [open, setOpen] = useState(false)
  // Index of the keyboard-highlighted option (-1 = none highlighted).
  const [activeIndex, setActiveIndex] = useState(-1)
  // Monotonic id of the latest in-flight `onSearch`. A response only applies if
  // its token still equals the latest — the stale-response race guard.
  const requestRef = useRef(0)
  const baseId = useId()
  const listId = `${baseId}-listbox`
  /**
   * Stable DOM id for the option at `index` (referenced by aria-activedescendant).
   * @param index - Option position.
   */
  const optionId = (index: number): string => `${baseId}-option-${index}`
  // Both resets happen during render (React's "adjust state when a prop changes"
  // pattern), so no committed frame shows what they remove. A new query resets
  // the keyboard highlight (for the internal and the controlled `suggestions`
  // data modes alike). A query that cannot search (no searcher, or shorter than
  // minChars) drops the fetched results; one that can keeps the previous
  // query's results until its own search answers, as the other frameworks do.
  const [previousValue, setPreviousValue] = useState(value)
  if (previousValue !== value) {
    setPreviousValue(value)
    setActiveIndex(-1)
  }
  const canSearch = Boolean(onSearch) && value.length >= minChars
  if (!canSearch && internal.length > 0) setInternal([])
  const list = controlledSuggestions ?? internal
  // The popover is only visible with open + at least one suggestion.
  const isExpanded = open && list.length > 0
  // The highlight clamped to the current list: a list that shrinks below the
  // highlighted index leaves the old option id pointing at nothing, so every
  // read of the index (activedescendant, the highlighted option, Enter) sees
  // -1 — nothing highlighted — instead of naming an option that is gone.
  const active = activeIndex < list.length ? activeIndex : -1

  useEffect(() => {
    if (!onSearch || value.length < minChars) return
    const id = setTimeout(() => {
      const token = ++requestRef.current
      Promise.resolve(onSearch(value))
        .then((r) => {
          // Drop a response that lost the race: only the LATEST request may
          // apply, so a slow earlier fetch can't clobber fresher results.
          if (token === requestRef.current) setInternal(r)
        })
        .catch((_error) => {
          // Typeahead is best-effort — a failed suggestion fetch simply yields
          // no suggestions for THIS query. Guard on the token so an
          // out-of-order failure can't wipe a fresher successful result.
          if (token === requestRef.current) setInternal([])
        })
    }, debounceMs)
    return () => clearTimeout(id)
  }, [value, onSearch, debounceMs, minChars])

  const dismiss = useCallback(() => {
    setOpen(false)
    setActiveIndex(-1)
  }, [])

  /**
   * Commits a suggestion selection and closes the popover.
   * @param item - The chosen suggestion.
   */
  function select(item: SuggestionItem<T>): void {
    onSelect(item)
    dismiss()
  }

  /**
   * Full keyboard support for the combobox: ArrowDown/ArrowUp move the
   * highlight (opening the popover if needed), Enter selects the highlighted
   * option, Escape closes.
   * @param e - The keyboard event from the input.
   */
  function onKeyDown(e: KitKeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        if (list.length > 0) setOpen(true)
        return
      }
      if (list.length === 0) return
      setActiveIndex((i) => (i + 1) % list.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        if (list.length > 0) setOpen(true)
        return
      }
      if (list.length === 0) return
      setActiveIndex((i) => (i <= 0 ? list.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      if (isExpanded && active >= 0) {
        e.preventDefault()
        select(list[active])
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault()
        dismiss()
      }
    }
  }

  return (
    <Box
      as="div"
      onPressOutside={open ? dismiss : undefined}
      className={cm.cn(cm.position('relative'), className)}
    >
      <Input
        type="search"
        value={value}
        onChange={(e) => {
          const target = e.target
          if (!target || !('value' in target) || typeof target.value !== 'string') return
          onChange(target.value)
          setOpen(true)
        }}
        onFocus={() => value.length >= minChars && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder ?? t('search.placeholder', {}, { defaultValue: 'Search…' })}
        role="combobox"
        aria-label={ariaLabel ?? t('search.aria.label', undefined, { defaultValue: 'Search' })}
        aria-autocomplete="list"
        aria-expanded={isExpanded}
        aria-controls={listId}
        aria-activedescendant={isExpanded && active >= 0 ? optionId(active) : undefined}
      />
      {isExpanded && (
        <ScrollArea
          as="ul"
          role="listbox"
          id={listId}
          className={cm.cn(cm.stack(0 as const), cm.sp('p', 1))}
          webStyle={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'var(--color-surface, #fff)',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {list.map((s, index) => (
            <Pressable
              as="li"
              key={s.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              tabIndex={-1}
              data-mol-id="search-autocomplete-option"
              onMouseEnter={() => setActiveIndex(index)}
              // Pointer selection happens on press: preventDefault keeps DOM focus on
              // the input, which owns the combobox (options are its
              // aria-activedescendant targets; the keyboard selects with Enter there).
              onMouseDown={(e) => {
                e.preventDefault()
                select(s)
              }}
              className={cm.cn(
                cm.sp('px', 2),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.cursorPointer,
                index === activeIndex && cm.surfaceSecondary,
              )}
            >
              <Box as="div" className={cm.fontWeight('medium')}>
                {s.label}
              </Box>
              {s.meta && (
                <Box as="div" className={cm.textSize('xs')}>
                  {s.meta}
                </Box>
              )}
            </Pressable>
          ))}
        </ScrollArea>
      )}
    </Box>
  )
}
