import type { JSX, ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Input } from '@molecule/app-ui-react'

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
  const wrapRef = useRef<HTMLDivElement>(null)
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
  const list = controlledSuggestions ?? internal
  // The popover is only visible with open + at least one suggestion.
  const isExpanded = open && list.length > 0

  useEffect(() => {
    if (!onSearch || value.length < minChars) {
      setInternal([])
      return
    }
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

  // A new query resets the keyboard highlight (works for both the internal and
  // the controlled `suggestions` data modes).
  useEffect(() => {
    setActiveIndex(-1)
  }, [value])

  useEffect(() => {
    if (!open) return
    /**
     * Closes the dropdown when a click occurs outside the wrapper element.
     * @param e
     */
    function onDoc(e: MouseEvent): void {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  /**
   * Commits a suggestion selection and closes the popover.
   * @param item - The chosen suggestion.
   */
  function select(item: SuggestionItem<T>): void {
    onSelect(item)
    setOpen(false)
    setActiveIndex(-1)
  }

  /**
   * Full keyboard support for the combobox: ArrowDown/ArrowUp move the
   * highlight (opening the popover if needed), Enter selects the highlighted
   * option, Escape closes.
   * @param e - The keyboard event from the input.
   */
  function onKeyDown(e: KeyboardEvent): void {
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
      if (isExpanded && activeIndex >= 0 && activeIndex < list.length) {
        e.preventDefault()
        select(list[activeIndex])
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault()
        setOpen(false)
        setActiveIndex(-1)
      }
    }
  }

  return (
    <div ref={wrapRef} className={cm.cn(cm.position('relative'), className)}>
      <Input
        type="search"
        value={value}
        onChange={(e) => {
          onChange((e.target as HTMLInputElement).value)
          setOpen(true)
        }}
        onFocus={() => value.length >= minChars && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder ?? t('search.placeholder', {}, { defaultValue: 'Search…' })}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isExpanded}
        aria-controls={listId}
        aria-activedescendant={isExpanded && activeIndex >= 0 ? optionId(activeIndex) : undefined}
      />
      {isExpanded && (
        <ul
          role="listbox"
          id={listId}
          className={cm.cn(cm.stack(0 as const), cm.sp('p', 1))}
          style={{
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
            <li
              key={s.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => select(s)}
              className={cm.cn(
                cm.sp('px', 2),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.cursorPointer,
                index === activeIndex && cm.surfaceSecondary,
              )}
            >
              <div className={cm.fontWeight('medium')}>{s.label}</div>
              {s.meta && <div className={cm.textSize('xs')}>{s.meta}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
