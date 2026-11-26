<!--
  QuickPicker: the Svelte counterpart of `@molecule/app-ide-react`'s
  `QuickPicker` (see that file for the design notes) — the reusable quick
  picker overlay Quick Open and the Command Palette render: a filterable,
  keyboard-navigable list at the top-center of the viewport, above a
  click-away backdrop. Same props (React names), same DOM for the same input,
  same callbacks. Rows are ordered by a fuzzy score of the query; the
  highlighted row follows the arrow keys and the pointer, and Enter selects it.

  The selected-row tint follows the theme primary (so a rebranded app tints
  its own picker), never a literal blue; the hex is only the CSS-var fallback.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
  ClassMap can't express. All user-facing text goes through `t()`.
-->
<script module lang="ts">
  import type { Snippet } from 'svelte'

  import { fuzzyScore } from '@molecule/app-ide-panel-logic/panels'
  import { useThemeMode, useTranslation } from '@molecule/app-svelte'
  import { getClassMap, type OverlayTarget } from '@molecule/app-ui'
  import { Modal } from '@molecule/app-ui-svelte'

  import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
  import type * as types from '../types.js'

  /** Re-exported from the plain-TS contract module (src/props.ts). */
  export type QuickPickerItem = types.QuickPickerItem

  /** Re-exported from the plain-TS contract module (src/props.ts). */
  export type QuickPickerProps = types.QuickPickerProps

  /**
   * Whether a field holds a snippet (a node value) rather than plain text.
   *
   * @param value - The item field.
   * @returns True when it renders through a snippet.
   */
  function isSnippet(value: unknown): value is Snippet {
    return typeof value === 'function'
  }

  /**
   * The text a plain field renders (React renders strings and numbers as
   * text).
   *
   * @param value - The item field.
   * @returns The text, or `''` for a snippet field.
   */
  function textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }
</script>

<script lang="ts">
  let {
    items,
    placeholder,
    onSelect,
    onDismiss,
    loading,
    initialQuery,
    className,
  }: QuickPickerProps = $props()

  const { t } = useTranslation()
  const mode = useThemeMode()
  const isNarrowStore = useNarrowViewport()
  const isCoarseStore = useCoarsePointer()

  // `query` seeds ONCE from `initialQuery` (React's `useState`): a later
  // `initialQuery` prop never reseeds it.
  // svelte-ignore state_referenced_locally
  let query = $state(initialQuery ?? '')
  let selectedIndex = $state(0)
  let inputEl = $state<HTMLInputElement | null>(null)
  let listEl = $state<HTMLDivElement | null>(null)

  const inputTarget: OverlayTarget = {
    get current() {
      return inputEl
    },
  }

  // Filter and sort items by fuzzy match
  const filtered = $derived.by(() => {
    if (!query.trim()) return items
    const scored = items
      .map((item) => ({ item, score: fuzzyScore(query, item.label) }))
      .filter((s) => s.score >= 0)
    scored.sort((a, b) => b.score - a.score)
    return scored.map((s) => s.item)
  })

  // Reset selection when the filtered list changes, BEFORE the DOM updates
  // (React resets during the render that replaced the list): an after-render
  // effect would first paint the carried-over index's row on the new list —
  // and a row that is tinted and untinted like that carries `transparent`
  // expanded, which a row never tinted does not.
  $effect.pre(() => {
    void filtered
    selectedIndex = 0
  })

  // Scroll selected item into view
  $effect(() => {
    const el = listEl?.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  })

  // React keeps the search field's `value` ATTRIBUTE in step with the
  // controlled value (Svelte's `value={…}` sets only the property; the
  // serialized markup carries both).
  $effect(() => {
    inputEl?.setAttribute('value', query)
  })

  // The selected-row tint follows the theme primary (so a rebranded app tints
  // its own picker), never a literal blue; the hex is only the CSS-var fallback.
  const selectedBg = $derived(
    $mode === 'light'
      ? 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 12%, transparent)'
      : 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 25%, transparent)',
  )

  const cm = $derived(getClassMap())

  // React's `border: none` + `border-bottom` lands in the DOM with
  // `border-image: none` beside the four sides. This framework's style
  // binding parses the style text in one shot, and that parse drops a
  // `border-image` declaration beside `border-*` sides — so it is applied
  // through `setProperty` after the render that wrote the sides, re-applied
  // whenever the input's reactive style text is.
  $effect(() => {
    void $isNarrowStore
    void $isCoarseStore
    inputEl?.style.setProperty('border-image', 'none')
  })

  /**
   * The keyboard navigation: the arrows move the highlight within the
   * filtered rows (clamped), Enter selects it. The kit handles Escape. Bound to the
   * panel, so a key press anywhere in it (the autofocus input first of all)
   * lands here.
   *
   * @param event - The key press.
   */
  function handleKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        selectedIndex = Math.max(selectedIndex - 1, 0)
        break
      case 'Enter':
        event.preventDefault()
        if (filtered[selectedIndex]) onSelect(filtered[selectedIndex]!)
        break
    }
  }
</script>

<Modal
  open
  onClose={onDismiss}
  initialFocus={inputTarget}
  showCloseButton={false}
  centered={!$isNarrowStore}
  aria-label={t('ide.quickPicker.label', undefined, { defaultValue: 'Quick picker' })}
  {className}
  style={$isNarrowStore ? { maxHeight: 'min(60dvh, 480px)' } : undefined}
>
  <!-- The input's borders are written expanded (React's `border: none` +
       `border-bottom` lands in the DOM as five declarations) with background
       last; `border-image` rides the effect above. -->
  <input
    bind:this={inputEl}
    type="text"
    value={query}
    oninput={(event) => {
      query = event.currentTarget.value
    }}
    onkeydown={handleKeyDown}
    placeholder={placeholder ??
      t('ide.quickPicker.placeholder', undefined, { defaultValue: 'Type to search…' })}
    style={`width: 100%; font-size: ${
      $isNarrowStore || $isCoarseStore ? '16px' : '13px'
    }; padding: 10px 12px; border-top: medium; border-right: medium; border-left: medium; border-bottom: 1px solid var(--color-border, #333); color: var(--mol-color-text, currentColor); outline: none; box-sizing: border-box; flex-shrink: 0; background: transparent`}
  />
  <div
    bind:this={listEl}
    style={`${$isNarrowStore ? '' : 'max-height: 300px;'} min-height: 0px; overflow: auto`}
  >
    {#if loading}
      <div
        style="padding: 12px; font-size: 12px; color: var(--mol-color-text-secondary, #888); text-align: center"
      >
        {t('ide.quickPicker.loading', undefined, { defaultValue: 'Loading…' })}
      </div>
    {:else if filtered.length === 0}
      <div
        style="padding: 12px; font-size: 12px; color: var(--mol-color-text-secondary, #888); text-align: center"
      >
        {t('ide.quickPicker.noResults', undefined, { defaultValue: 'No matching results' })}
      </div>
    {:else}
      {#each filtered as item, i (item.id)}
        <!-- The selected-row tint is a `style:` directive, not part of the
             style text: React rewrites a row's background through the CSSOM
             setter when the highlight moves it, and that write's parsed result
             (a re-selected row's tint, a deselected row's `transparent`
             expanded into its longhands) is what the DOM carries. -->
        <button
          type="button"
          data-mol-id={`quick-picker-item-${item.id}`}
          onclick={() => onSelect(item)}
          onkeydown={handleKeyDown}
          onmouseenter={() => {
            selectedIndex = i
          }}
          class={cm.touchTargetCompact}
          style="display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 12px; border: none; color: var(--mol-color-text, currentColor); cursor: pointer; font-size: 13px; text-align: left"
          style:background={i === selectedIndex ? selectedBg : 'transparent'}
        >
          {#if item.icon != null}{#if isSnippet(item.icon)}{@render item.icon?.()}{:else}{textOf(
                item.icon,
              )}{/if}{/if}
          <span
            style="flex: 1 1 0%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
          >
            {item.label}
          </span>
          {#if item.detail}
            <span
              style="font-size: 11px; color: var(--mol-color-text-secondary, #888); flex-shrink: 0"
            >
              {item.detail}
            </span>
          {/if}
        </button>
      {/each}
    {/if}
  </div>
</Modal>
