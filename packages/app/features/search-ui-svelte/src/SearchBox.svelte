<!--
  SearchBox: the Svelte counterpart of `@molecule/app-search-ui-react`'s
  `SearchBox` — the field with its clear button and shortcut cap, a help icon
  whose tooltip shows the search syntax, an afterField slot for the consumer's
  own tabs, the active filter chips and the hit count.
-->
<script lang="ts">
  import type { ClientSearchFilter } from '@molecule/app-client-search'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Icon, Tooltip } from '@molecule/app-ui-svelte'

  import Kbd from './Kbd.svelte'
  import type { SearchBoxProps } from './types.js'

  let {
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
    autoFocus = false,
    afterField,
    molId = 'search',
    className,
  }: SearchBoxProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let focused = $state(false)
  let inputEl: HTMLInputElement | null = $state(null)

  /**
   * The chip's text: a negation mark, the field and the accepted values, as
   * React builds it.
   *
   * @param f - The filter.
   * @returns The chip text.
   */
  const chipText = (f: ClientSearchFilter): string =>
    `${f.negate ? '−' : ''}${f.field}: ${f.values.join(', ')}`

  // Assign the input element into `inputRef` (React's `ref`), then focus it on
  // mount and whenever the ask changes, the way React's effect keyed on
  // `autoFocus` and `inputRef` does.
  $effect(() => {
    if (inputRef) inputRef.current = inputEl
  })
  $effect(() => {
    if (autoFocus) inputRef?.current?.focus()
  })

  // React keeps a controlled input's content attribute in sync with the
  // rendered value; Svelte's `value` writes only the API value.
  $effect(() => {
    if (inputEl) inputEl.setAttribute('value', value)
  })

  const showCount = $derived(count !== undefined && value.trim().length > 0)
  const showHelp = $derived(Boolean(examples?.length))
  const hasStatus = $derived(filters.length > 0 || showCount)
  // The branch above only renders while a count was given, so the fallback
  // never shows; it satisfies the translation values' type.
  const countText = $derived(
    t('searchUi.count', { count: count ?? 0 }, { defaultValue: '{{count}} results' }),
  )
  const syntaxText = $derived(
    t('searchUi.syntax', undefined, {
      defaultValue: 'Narrow with a field, quote a phrase, or exclude a word:',
    }),
  )
  const keysText = $derived(
    t('searchUi.keys', undefined, {
      defaultValue: 'The arrow keys move through the results and Enter opens one.',
    }),
  )
  // The caller's example tokens, then the two built-in ones (their own words, translated).
  const examplesText = $derived([
    ...(examples ?? []),
    t('searchUi.examplePhrase', undefined, { defaultValue: '"exact phrase"' }),
    t('searchUi.exampleExcluded', undefined, { defaultValue: '-word' }),
  ])
  const dot = ' · '
  const space = ' '

  /**
   * Reports the typed text, then restores the field to the value the props
   * still hold, the way React's controlled input renders it back when the
   * caller keeps the old one.
   *
   * @param event - The input event.
   */
  const onInput = (event: Event): void => {
    const el = event.currentTarget as HTMLInputElement
    onChange(el.value)
    el.value = value
    el.setAttribute('value', value)
  }

  /** Clears the text and puts focus back in the field, as React's button does. */
  const onClearClick = (): void => {
    onClear?.()
    inputRef?.current?.focus()
  }
</script>

<div data-mol-id={`${molId}-box`}>
  <div class={cm.cn(cm.searchField, className)}>
    <span class={cm.searchFieldIcon} aria-hidden="true">
      <Icon name="search" size={18} />
    </span>
    <input
      bind:this={inputEl}
      type="search"
      {value}
      oninput={onInput}
      onkeydown={(event) => onKeyDown?.(event)}
      onfocusin={() => (focused = true)}
      onfocusout={() => (focused = false)}
      {placeholder}
      aria-label={label ?? placeholder}
      autocomplete="off"
      autocorrect="off"
      spellcheck="false"
      enterkeyhint="search"
      class={cm.searchFieldInput}
      data-mol-id={`${molId}-input`}
    />
    <span class={cm.searchFieldActions}>
      {#if showHelp}
        <Tooltip content={helpTips} placement="bottom-end">
          <button
            type="button"
            aria-label={t('searchUi.help', undefined, { defaultValue: 'Search tips' })}
            class={cm.searchFieldClear}
            data-mol-id={`${molId}-help`}
          >
            <Icon name="question" size={16} />
          </button>
        </Tooltip>
      {/if}
      {#if value && onClear}
        <button
          type="button"
          onclick={onClearClick}
          aria-label={t('searchUi.clear', undefined, { defaultValue: 'Clear search' })}
          class={cm.searchFieldClear}
          data-mol-id={`${molId}-clear`}
        >
          <span aria-hidden="true">×</span>
        </button>
      {/if}
      {#if shortcut && !value && !focused}<Kbd>{shortcut}</Kbd>{/if}
    </span>
  </div>
  {#if afterField}{@render afterField()}{/if}
  {#if hasStatus}
    <div class={cm.searchStatusRow}>
      {#each filters as f, i (`${f.field}:${f.values.join(',')}:${i}`)}
        <button
          type="button"
          onclick={() => onRemoveFilter?.(i)}
          aria-label={t(
            'searchUi.removeFilter',
            { filter: chipText(f) },
            {
              defaultValue: 'Remove filter {{filter}}',
            },
          )}
          class={cm.cn(cm.filterChip, f.negate && cm.filterChipNegated)}
          data-mol-id={`${molId}-filter`}
          data-filter-field={f.field}
        >
          {chipText(f)}
          <span class={cm.filterChipRemove} aria-hidden="true">×</span>
        </button>
      {/each}
      <span class={cm.mxAuto}></span>
      {#if showCount}
        <span data-mol-id={`${molId}-count`}>{countText}</span>
      {/if}
    </div>
  {/if}
</div>

{#snippet helpTips()}
  <!-- The tooltip's content class keeps short labels on one line; the tips are
       a sentence or two, so the inner block wraps on its own. -->
  <div class={cm.searchTips} style="white-space: normal; max-width: 360px">
    {syntaxText}
    {#each examplesText as ex, i (i)}
      <span>{i > 0 ? ' · ' : ''}<code>{ex}</code></span>
    {/each}
    {dot}
    <Kbd>↑</Kbd>
    <Kbd>↓</Kbd>
    <Kbd>↵</Kbd>{space}
    {keysText}
  </div>
{/snippet}
