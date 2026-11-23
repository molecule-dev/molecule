<!--
  SearchAutocomplete: the Svelte counterpart of
  `@molecule/app-search-autocomplete-react`'s `SearchAutocomplete` — a search
  input with a typeahead suggestion popover (ARIA combobox, both data modes,
  the keyboard highlight/select/close machine, the outside-mousedown close and
  the stale-response race guard). Same props, same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Input } from '@molecule/app-ui-svelte'

  import { nextSearchAutocompleteId } from './ids.js'
  import type { SearchAutocompleteProps, SuggestionItem } from './types.js'

  let {
    value,
    onChange,
    onSearch,
    suggestions,
    onSelect,
    placeholder,
    ariaLabel,
    debounceMs = 200,
    minChars = 1,
    className,
  }: SearchAutocompleteProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let internal = $state<SuggestionItem[]>([])
  let open = $state(false)
  let activeIndex = $state(-1)
  let wrapper: HTMLDivElement | undefined = $state()
  // Monotonic id of the latest in-flight `onSearch`. A response only applies if
  // its token still equals the latest — the stale-response race guard.
  let request = 0
  const baseId = nextSearchAutocompleteId()
  const listId = `${baseId}-listbox`

  /**
   * Stable DOM id for the option at `index` (referenced by aria-activedescendant).
   * @param index - Option position.
   * @returns The option id.
   */
  function optionId(index: number): string {
    return `${baseId}-option-${index}`
  }

  /** The suggestion list: the caller's controlled list wins over fetched results. */
  const list = $derived(suggestions ?? internal)

  /** The popover is only visible with open + at least one suggestion. */
  const isExpanded = $derived(open && list.length > 0)

  /**
   * The highlight clamped to the current list: a list that shrinks below the
   * highlighted index leaves the old option id pointing at nothing, so every
   * read of the index (activedescendant, the highlighted option, Enter) sees
   * -1 — nothing highlighted — instead of naming an option that is gone.
   */
  const active = $derived(activeIndex < list.length ? activeIndex : -1)

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so it re-runs on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const placeholderText = $derived(
    placeholder ?? t('search.placeholder', {}, { defaultValue: 'Search…' }),
  )
  const ariaLabelText = $derived(
    ariaLabel ?? t('search.aria.label', undefined, { defaultValue: 'Search' }),
  )

  // React's debounced `onSearch` effect: a new value/search/debounce/minChars
  // restarts the timer; a query shorter than minChars clears the results.
  $effect(() => {
    const query = value
    const search = onSearch
    if (!search || query.length < minChars) {
      internal = []
      return
    }
    const timer = setTimeout(() => {
      const token = ++request
      Promise.resolve(search(query))
        .then((result) => {
          // Drop a response that lost the race: only the LATEST request may
          // apply, so a slow earlier fetch can't clobber fresher results.
          if (token === request) internal = result
        })
        .catch((_error) => {
          // Typeahead is best-effort — a failed suggestion fetch simply yields
          // no suggestions for THIS query. Guard on the token so an
          // out-of-order failure can't wipe a fresher successful result.
          if (token === request) internal = []
        })
    }, debounceMs)
    return () => clearTimeout(timer)
  })

  // A new query resets the keyboard highlight (works for both the internal and
  // the controlled `suggestions` data modes). The last value is remembered so
  // an unrelated prop update — which re-reads the same query — keeps the
  // highlight, as React's `[value]` dependency does.
  let lastValue: string | undefined
  $effect(() => {
    const current = value
    if (current === lastValue) return
    lastValue = current
    activeIndex = -1
  })

  // React's outside-mousedown effect: the listener exists only while open. The
  // returned function runs when the effect re-runs or the component unmounts.
  $effect(() => {
    if (!open) return
    /**
     * Closes the dropdown when a click occurs outside the wrapper element.
     * @param event - The document mousedown.
     */
    const onDoc = (event: MouseEvent): void => {
      if (!wrapper?.contains(event.target as Node)) {
        open = false
        activeIndex = -1
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
    }
  })

  /**
   * Commits a suggestion selection and closes the popover.
   * @param item - The chosen suggestion.
   */
  function select(item: SuggestionItem): void {
    onSelect?.(item)
    open = false
    activeIndex = -1
  }

  /**
   * Full keyboard support for the combobox: ArrowDown/ArrowUp move the
   * highlight (opening the popover if needed), Enter selects the highlighted
   * option, Escape closes.
   * @param event - The keyboard event from the input.
   */
  function onKeyDown(event: KeyboardEvent): void {
    const current = list
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) {
        if (current.length > 0) open = true
        return
      }
      if (current.length === 0) return
      activeIndex = (activeIndex + 1) % current.length
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        if (current.length > 0) open = true
        return
      }
      if (current.length === 0) return
      activeIndex = activeIndex <= 0 ? current.length - 1 : activeIndex - 1
    } else if (event.key === 'Enter') {
      if (isExpanded && active >= 0) {
        event.preventDefault()
        select(current[active] as SuggestionItem)
      }
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault()
        open = false
        activeIndex = -1
      }
    }
  }
</script>

<div bind:this={wrapper} class={cm.cn(cm.position('relative'), className)}>
  <Input
    type="search"
    {value}
    onChange={(event: Event) => {
      onChange?.((event.target as HTMLInputElement).value)
      open = true
    }}
    onFocus={() => {
      if (value.length >= minChars) open = true
    }}
    {onKeyDown}
    placeholder={placeholderText}
    role="combobox"
    aria-label={ariaLabelText}
    aria-autocomplete="list"
    aria-expanded={isExpanded ? 'true' : 'false'}
    aria-controls={listId}
    aria-activedescendant={isExpanded && active >= 0 ? optionId(active) : undefined}
  />
  {#if isExpanded}
    <ul
      role="listbox"
      id={listId}
      class={cm.cn(cm.stack(0), cm.sp('p', 1))}
      style="position: absolute; top: 100%; left: 0px; right: 0px; z-index: 50; background: var(--color-surface, #fff); border: 1px solid rgba(0, 0, 0, 0.1); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); max-height: 320px; overflow-y: auto"
    >
      {#each list as suggestion, index (suggestion.id)}
        <li
          id={optionId(index)}
          role="option"
          aria-selected={index === active ? 'true' : 'false'}
          tabindex={-1}
          data-mol-id="search-autocomplete-option"
          onmouseenter={() => (activeIndex = index)}
          onmousedown={(event) => {
            // Pointer selection happens on press: preventDefault keeps DOM
            // focus on the input, which owns the combobox.
            event.preventDefault()
            select(suggestion)
          }}
          class={cm.cn(
            cm.sp('px', 2),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.cursorPointer,
            index === active && cm.surfaceSecondary,
          )}
        >
          <div class={cm.fontWeight('medium')}>
            {#if typeof suggestion.label === 'function'}{@render suggestion.label?.()}{:else}{suggestion.label}{/if}
          </div>
          {#if suggestion.meta}
            <div class={cm.textSize('xs')}>
              {#if typeof suggestion.meta === 'function'}{@render suggestion.meta?.()}{:else}{suggestion.meta}{/if}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
