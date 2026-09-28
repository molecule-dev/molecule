import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from 'react'
import { useEffect, useState } from 'react'

import type { ClientSearchFilter } from '@molecule/app-client-search'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Icon, Tooltip } from '@molecule/app-ui-react'

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
  /**
   * Example tokens for the search tips, e.g. `['category:auth', 'type:bond']`.
   * Given, a help icon sits inside the field and shows the syntax on hover or
   * focus. Omit for no help icon.
   */
  examples?: string[]
  /** The key that focuses the box, shown as a cap while it is empty. `null` hides it. Defaults to `/`. */
  shortcut?: string | null
  /** Focus the input on mount. */
  autoFocus?: boolean
  /**
   * Rendered directly under the field, before the status row (chips and
   * count), so a consumer can put its own controls — tabs, a scope switch —
   * right below the input.
   */
  afterField?: ReactNode
  /** `data-mol-id` prefix: `<molId>-input`, `-clear`, `-help`, `-filter`, `-count`. */
  molId?: string
  /** Extra classes composed onto the field. */
  className?: string
}

/**
 * A search field: a leading icon, the input, a help icon that shows the
 * syntax on hover, an × to clear, and the shortcut cap; under it, whatever
 * `afterField` holds, then the active filters as removable chips and the
 * hit count. The field stays mounted, and its text with it, across searches.
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
  afterField,
  molId = 'search',
  className,
}: SearchBoxProps): React.JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (autoFocus) inputRef?.current?.focus()
  }, [autoFocus, inputRef])

  const showCount = count !== undefined && value.trim().length > 0
  const showHelp = Boolean(examples?.length)
  const hasStatus = filters.length > 0 || showCount

  const help = showHelp ? (
    // The tooltip's content class keeps short labels on one line; the tips
    // are a sentence or two, so the inner block wraps on its own.
    <div className={cm.searchTips} style={{ whiteSpace: 'normal', maxWidth: 360 }}>
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
    </div>
  ) : null

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
          {help ? (
            <Tooltip content={help} placement="bottom-end">
              <button
                type="button"
                aria-label={t('searchUi.help', undefined, { defaultValue: 'Search tips' })}
                className={cm.searchFieldClear}
                data-mol-id={`${molId}-help`}
              >
                <Icon name="question" size={16} />
              </button>
            </Tooltip>
          ) : null}
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
      {afterField}
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
        </div>
      ) : null}
    </div>
  )
}
