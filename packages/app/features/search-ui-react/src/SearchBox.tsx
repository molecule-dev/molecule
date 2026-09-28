import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import { useEffect, useState } from 'react'

import type { ClientSearchFilter } from '@molecule/app-client-search'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from '@molecule/app-ui-react'

import { Kbd } from './Kbd.js'

/** Props for {@link SearchBox}. */
export interface SearchBoxProps {
  /** The text. */
  value: string
  /** Called with the new text on every keystroke. */
  onChange: (value: string) => void
  /** Key handling for the input (arrows, Enter, Escape), usually a session's `onKeyDown`. */
  onKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement>) => void
  /** A ref to the input, so a shortcut can focus it. */
  inputRef?: RefObject<HTMLInputElement | null>
  /** Placeholder, already translated. Also the accessible name unless `label` is given. */
  placeholder: string
  /** Accessible name for the input, already translated. Defaults to `placeholder`. */
  label?: string
  /** How many hits the current text has. Omit to show no count. */
  count?: number
  /** Active `field:value` filters, shown as removable chips. */
  filters?: ClientSearchFilter[]
  /** Removes the i-th filter. */
  onRemoveFilter?: (index: number) => void
  /** Clears the text. Shown as an × while there is text. */
  onClear?: () => void
  /** Example tokens for the tips line, e.g. `['category:auth', 'type:bond']`. Omit for no tips. */
  examples?: string[]
  /** The key that focuses the box, shown as a cap while it is empty. `null` hides it. Defaults to `/`. */
  shortcut?: string | null
  /** Focus the input on mount. */
  autoFocus?: boolean
  /** `data-mol-id` prefix: `<molId>-input`, `-clear`, `-filter`, `-count`, `-tips`. */
  molId?: string
  /** Extra classes composed onto the field. */
  className?: string
}

/**
 * A search field: a leading icon, the input, an × to clear, and the shortcut
 * cap; under it, the active filters as removable chips, the hit count and a
 * one-line syntax tip behind a "Tips" toggle. The field stays mounted, and
 * its text with it, across searches.
 *
 * @param props - See {@link SearchBoxProps}.
 * @returns The field and its status row.
 */
export function SearchBox({
  value,
  onChange,
  onKeyDown,
  inputRef,
  placeholder,
  label,
  count,
  filters = [],
  onRemoveFilter,
  onClear,
  examples,
  shortcut = '/',
  autoFocus,
  molId = 'search',
  className,
}: SearchBoxProps): React.JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [tips, setTips] = useState(false)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (autoFocus) inputRef?.current?.focus()
  }, [autoFocus, inputRef])

  const showCount = count !== undefined && value.trim().length > 0
  const showTips = Boolean(examples?.length)
  const hasStatus = filters.length > 0 || showCount || showTips

  return (
    <div data-mol-id={`${molId}-box`}>
      <div className={cm.cn(cm.searchField, className)}>
        <span className={cm.searchFieldIcon} aria-hidden="true">
          <Icon name="search" size={18} />
        </span>
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          aria-label={label ?? placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          className={cm.searchFieldInput}
          data-mol-id={`${molId}-input`}
        />
        <span className={cm.searchFieldActions}>
          {value && onClear ? (
            <button
              type="button"
              onClick={() => {
                onClear()
                inputRef?.current?.focus()
              }}
              aria-label={t('searchUi.clear', undefined, { defaultValue: 'Clear search' })}
              className={cm.searchFieldClear}
              data-mol-id={`${molId}-clear`}
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {shortcut && !value && !focused ? <Kbd>{shortcut}</Kbd> : null}
        </span>
      </div>
      {hasStatus ? (
        <div className={cm.searchStatusRow}>
          {filters.map((f, i) => {
            const text = `${f.negate ? '−' : ''}${f.field}: ${f.values.join(', ')}`
            return (
              <button
                key={`${f.field}:${f.values.join(',')}:${i}`}
                type="button"
                onClick={() => onRemoveFilter?.(i)}
                aria-label={t(
                  'searchUi.removeFilter',
                  { filter: text },
                  { defaultValue: 'Remove filter {{filter}}' },
                )}
                className={cm.cn(cm.filterChip, f.negate && cm.filterChipNegated)}
                data-mol-id={`${molId}-filter`}
                data-filter-field={f.field}
              >
                {text}
                <span className={cm.filterChipRemove} aria-hidden="true">
                  ×
                </span>
              </button>
            )
          })}
          <span className={cm.mxAuto} />
          {showCount ? (
            <span data-mol-id={`${molId}-count`}>
              {t('searchUi.count', { count }, { defaultValue: '{{count}} results' })}
            </span>
          ) : null}
          {showTips ? (
            <button
              type="button"
              onClick={() => setTips((v) => !v)}
              aria-expanded={tips}
              className={cm.cn(cm.link, cm.textSize('sm'))}
              data-mol-id={`${molId}-tips`}
            >
              {tips
                ? t('searchUi.tipsHide', undefined, { defaultValue: 'Hide tips' })
                : t('searchUi.tips', undefined, { defaultValue: 'Tips' })}
            </button>
          ) : null}
        </div>
      ) : null}
      {tips && showTips ? (
        <p className={cm.searchTips} data-mol-id={`${molId}-tips-text`}>
          {t('searchUi.syntax', undefined, {
            defaultValue: 'Narrow with a field, quote a phrase, or exclude a word:',
          })}{' '}
          {[...(examples ?? []), '"exact phrase"', '-word'].map((ex, i) => (
            <span key={ex}>
              {i > 0 ? ' · ' : ''}
              <code>{ex}</code>
            </span>
          ))}
          {' · '}
          <Kbd>↑</Kbd> <Kbd>↓</Kbd> <Kbd>↵</Kbd>{' '}
          {t('searchUi.keys', undefined, {
            defaultValue: 'The arrow keys move through the results and Enter opens one.',
          })}
        </p>
      ) : null}
    </div>
  )
}
