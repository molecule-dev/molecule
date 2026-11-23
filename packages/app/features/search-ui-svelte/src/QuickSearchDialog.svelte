<!--
  QuickSearchDialog: the Svelte counterpart of
  `@molecule/app-search-ui-react`'s `QuickSearchDialog` — the box on top with
  focus, the hits below in a scrolling pane, and the key hints in the footer.
  Before anything is typed the pane shows `idleText` rather than a browse list.
  The dialog is named for screen readers through `label` (or the translated
  "Search" default).
-->
<script lang="ts" generics="T extends ClientSearchDocument">
  import type { ClientSearchDocument } from '@molecule/app-client-search'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Modal } from '@molecule/app-ui-svelte'

  import Kbd from './Kbd.svelte'
  import SearchBox from './SearchBox.svelte'
  import SearchResults from './SearchResults.svelte'
  import type { QuickSearchDialogProps } from './types.js'

  let {
    open,
    onClose,
    session,
    view,
    placeholder,
    examples,
    emptyText,
    idleText,
    renderLink,
    label,
    molId = 'quick-search',
  }: QuickSearchDialogProps<T> = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // The single space React renders between the key hints and their sentence.
  const space = ' '

  // The dialog pattern: focus moves into the field when it opens. The input is
  // mounted only while open, and effects run after the field exists.
  $effect(() => {
    if (open) session.inputRef.current?.focus()
  })
</script>

{#if open}
  <Modal
    {open}
    {onClose}
    size="lg"
    closeOnEscape={false}
    showCloseButton={false}
    closeLabel={t('searchUi.close', undefined, { defaultValue: 'Close' })}
    aria-label={label ?? t('searchUi.dialogLabel', undefined, { defaultValue: 'Search' })}
    data-mol-id={molId}
  >
    <SearchBox
      value={session.query}
      onChange={session.setQuery}
      onKeyDown={session.onKeyDown}
      inputRef={session.inputRef}
      {placeholder}
      count={session.active ? session.hits.length : undefined}
      filters={session.parsed.filters}
      onRemoveFilter={session.removeFilter}
      onClear={session.clear}
      {examples}
      shortcut={null}
      {molId}
    />
    <div class={cm.dialogBody} data-mol-id={`${molId}-pane`}>
      <SearchResults
        hits={session.active ? session.hits : []}
        {view}
        activeIndex={session.activeIndex}
        onActivate={session.setActiveIndex}
        onOpen={session.open}
        onPrefetch={session.prefetch}
        {renderLink}
        emptyText={session.active ? emptyText : (idleText ?? emptyText)}
        {molId}
      />
    </div>
    <p class={cm.cn(cm.dialogFooter, cm.resultMeta)} data-mol-id={`${molId}-keys`}>
      <Kbd>↑</Kbd>
      <Kbd>↓</Kbd>
      <Kbd>↵</Kbd>
      <Kbd>esc</Kbd>{space}
      {t('searchUi.dialogKeys', undefined, {
        defaultValue: 'The arrow keys move through the results, Enter opens one, Escape closes.',
      })}
    </p>
  </Modal>
{/if}
