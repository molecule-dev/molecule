/**
 * Solid search field — the counterpart of `@molecule/app-search-ui-react`'s
 * `SearchBox`.
 *
 * @module
 */

import { createEffect, createSignal, For, type JSX } from 'solid-js'
import { unwrap } from 'solid-js/store'

import type { ClientSearchFilter } from '@molecule/app-client-search'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Icon, Tooltip } from '@molecule/app-ui-solid'

import { Kbd } from './Kbd.jsx'
import type { SearchBoxProps } from './types.js'

/** One stable record per chip key, created on first sight (React keys chips by its composite key). */
interface Chip {
  key: string
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
export const SearchBox = (props: SearchBoxProps): JSX.Element => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [focused, setFocused] = createSignal(false)

  // React's default parameters: the cap shows `/` unless hidden, and the ids
  // carry the `search` prefix unless overridden.
  const shortcut = (): string | null => (props.shortcut === undefined ? '/' : props.shortcut)
  const molId = (): string => props.molId ?? 'search'

  // Focus the input on mount and whenever the ask (or the ref) changes, the
  // way React's effect keyed on `autoFocus` and `inputRef` does.
  createEffect(() => {
    if (props.autoFocus) props.inputRef?.current?.focus()
  })

  /** The input element, held so the value sync and the clear button can reach it. */
  let inputEl: HTMLInputElement | null = null

  /**
   * Assigns the input element into `inputRef`, as React's `ref` does, and
   * clears it when the field unmounts. Written through the raw object, since
   * a reactive props holder proxies the caller's ref and refuses direct
   * mutation.
   *
   * @param el - The input element, or `null` as it unmounts.
   */
  const inputRefFn = (el: HTMLInputElement | null): void => {
    inputEl = el
    const ref = props.inputRef
    if (ref) unwrap(ref).current = el
  }

  // React keeps a controlled input's content attribute and API value in sync
  // with the rendered value; Solid's `value` writes only the API value, so
  // the attribute is set beside it on mount and on every change.
  createEffect(() => {
    const value = props.value
    if (inputEl) {
      inputEl.setAttribute('value', value)
      inputEl.value = value
    }
  })

  /**
   * Reports the typed text, then restores the field to the value the props
   * still hold, the way React's controlled input renders it back when the
   * caller keeps the old one.
   *
   * @param event - The input event.
   */
  const onInput = (event: InputEvent): void => {
    const el = event.currentTarget as HTMLInputElement
    props.onChange(el.value)
    el.value = props.value
    el.setAttribute('value', props.value)
  }

  /** Clears the text and puts focus back in the field, as React's button does. */
  const onClearClick = (): void => {
    props.onClear?.()
    props.inputRef?.current?.focus()
  }

  /**
   * Hands a key press to `onKeyDown` the way React's text field does. A legacy IME
   * reports key code 229 while it composes and on the Enter that confirms it, even
   * after composing ended: that Enter is cancelled first, so it submits nothing, and
   * the event reports the IME as composing. A composition still under way is the
   * IME's own and is handed over as it is.
   *
   * @param event - The input's keydown event.
   */
  const onKeydown = (event: KeyboardEvent): void => {
    const composing = event.isComposing
    const legacyComposition = event.keyCode === 229
    if (!composing && legacyComposition && event.key === 'Enter') event.preventDefault()
    if (legacyComposition) Object.defineProperty(event, 'isComposing', { value: true })
    props.onKeyDown?.(event)
  }

  /** One stable record per chip key, so a re-passed or reordered array keeps the rendered chips per key. */
  const chipRecords = new Map<string, Chip>()
  const keyedChips = (): Chip[] => {
    const seen = new Set<string>()
    const chips = filters().map((f, i) => {
      const key = `${f.field}:${f.values.join(',')}:${i}`
      seen.add(key)
      let chip = chipRecords.get(key)
      if (!chip) {
        chip = { key }
        chipRecords.set(key, chip)
      }
      return chip
    })
    for (const key of [...chipRecords.keys()]) if (!seen.has(key)) chipRecords.delete(key)
    return chips
  }
  const showCount = (): boolean => props.count !== undefined && props.value.trim().length > 0
  const showHelp = (): boolean => Boolean(props.examples?.length)
  const filters = (): ClientSearchFilter[] => props.filters ?? []

  /** The hit count text, or null while the text is blank or no count was given. */
  const countText = (): string | null => {
    const count = props.count
    if (count === undefined || props.value.trim().length === 0) return null
    return t('searchUi.count', { count }, { defaultValue: '{{count}} results' })
  }

  return (
    <div data-mol-id={`${molId()}-box`}>
      <div class={cm.cn(cm.searchField, props.className)}>
        <span class={cm.searchFieldIcon} aria-hidden="true">
          <Icon name="search" size={18} />
        </span>
        <input
          ref={inputRefFn}
          type="search"
          onInput={onInput}
          // No handler, no listener: nothing is cancelled for a field without key handling.
          onKeyDown={props.onKeyDown && onKeydown}
          onFocusIn={() => setFocused(true)}
          onFocusOut={() => setFocused(false)}
          placeholder={props.placeholder}
          aria-label={props.label ?? props.placeholder}
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          enterkeyhint="search"
          class={cm.searchFieldInput}
          data-mol-id={`${molId()}-input`}
        />
        <span class={cm.searchFieldActions}>
          {showHelp() ? (
            // The tooltip's content class keeps short labels on one line; the tips
            // are a sentence or two, so the inner block wraps on its own.
            <Tooltip
              content={
                <div
                  class={cm.searchTips}
                  style={{ 'white-space': 'normal', 'max-width': '360px' }}
                >
                  {t('searchUi.syntax', undefined, {
                    defaultValue: 'Narrow with a field, quote a phrase, or exclude a word:',
                  })}{' '}
                  {[
                    ...(props.examples ?? []),
                    t('searchUi.examplePhrase', undefined, { defaultValue: '"exact phrase"' }),
                    t('searchUi.exampleExcluded', undefined, { defaultValue: '-word' }),
                  ].map((ex, i) => (
                    <span>
                      {i > 0 ? ' · ' : ''}
                      <code>{ex}</code>
                    </span>
                  ))}{' '}
                  {' · '}
                  <Kbd>↑</Kbd> <Kbd>↓</Kbd> <Kbd>↵</Kbd>{' '}
                  {t('searchUi.keys', undefined, {
                    defaultValue: 'The arrow keys move through the results and Enter opens one.',
                  })}
                </div>
              }
              placement="bottom-end"
            >
              <button
                type="button"
                aria-label={t('searchUi.help', undefined, { defaultValue: 'Search tips' })}
                class={cm.searchFieldClear}
                data-mol-id={`${molId()}-help`}
              >
                <Icon name="question" size={16} />
              </button>
            </Tooltip>
          ) : null}
          {props.value && props.onClear ? (
            <button
              type="button"
              onClick={onClearClick}
              aria-label={t('searchUi.clear', undefined, { defaultValue: 'Clear search' })}
              class={cm.searchFieldClear}
              data-mol-id={`${molId()}-clear`}
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {shortcut() && !props.value && !focused() ? <Kbd>{shortcut()}</Kbd> : null}
        </span>
      </div>
      {props.afterField}
      {filters().length > 0 || showCount() ? (
        <div class={cm.searchStatusRow}>
          <For each={keyedChips()}>
            {(_chip, i) => {
              const f = (): ClientSearchFilter => filters()[i()]
              const text = (): string =>
                `${f().negate ? '−' : ''}${f().field}: ${f().values.join(', ')}`
              return (
                <button
                  type="button"
                  onClick={() => props.onRemoveFilter?.(i())}
                  aria-label={t(
                    'searchUi.removeFilter',
                    { filter: text() },
                    {
                      defaultValue: 'Remove filter {{filter}}',
                    },
                  )}
                  class={cm.cn(cm.filterChip, f().negate && cm.filterChipNegated)}
                  data-mol-id={`${molId()}-filter`}
                  data-filter-field={f().field}
                >
                  {text()}
                  <span class={cm.filterChipRemove} aria-hidden="true">
                    ×
                  </span>
                </button>
              )
            }}
          </For>
          <span class={cm.mxAuto} />
          {countText() ? <span data-mol-id={`${molId()}-count`}>{countText()}</span> : null}
        </div>
      ) : null}
    </div>
  )
}
