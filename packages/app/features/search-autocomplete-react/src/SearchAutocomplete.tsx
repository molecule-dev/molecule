import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Input } from '@molecule/app-ui-react'

/**
 *
 */
export interface SuggestionItem<T = unknown> {
  id: string
  label: ReactNode
  /** Optional secondary line / category. */
  meta?: ReactNode
  /** Original payload for the selection callback. */
  data?: T
}

interface SearchAutocompleteProps<T = unknown> {
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
 * @param root0
 * @param root0.value
 * @param root0.onChange
 * @param root0.onSearch
 * @param root0.suggestions
 * @param root0.onSelect
 * @param root0.placeholder
 * @param root0.debounceMs
 * @param root0.minChars
 * @param root0.className
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
}: SearchAutocompleteProps<T>) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [internal, setInternal] = useState<SuggestionItem<T>[]>([])
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const list = controlledSuggestions ?? internal

  useEffect(() => {
    if (!onSearch || value.length < minChars) {
      setInternal([])
      return
    }
    const id = setTimeout(async () => {
      const r = await onSearch(value)
      setInternal(r)
    }, debounceMs)
    return () => clearTimeout(id)
  }, [value, onSearch, debounceMs, minChars])

  useEffect(() => {
    if (!open) return
    /**
     *
     * @param e
     */
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

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
        placeholder={placeholder ?? t('search.placeholder', {}, { defaultValue: 'Search…' })}
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {open && list.length > 0 && (
        <ul
          role="listbox"
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
          {list.map((s) => (
            <li
              key={s.id}
              role="option"
              onClick={() => {
                onSelect(s)
                setOpen(false)
              }}
              className={cm.cn(cm.sp('px', 2), cm.sp('py', 2), cm.textSize('sm'), cm.cursorPointer)}
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
