<!--
  SearchResults: the Svelte counterpart of `@molecule/app-search-ui-react`'s
  `SearchResults` — the ranked hits with the matched terms marked, hover
  prefetch, and an optional action per row. The whole row is the link, so the
  list is a plain list of links (no listbox roles); the active row is marked
  with `aria-current` on its `li` and announced through a polite, visually
  hidden status region after the list. Apps pass a router link through
  `renderLink`.
-->
<script lang="ts" generics="T extends ClientSearchDocument">
  import type { ClientSearchDocument } from '@molecule/app-client-search'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import Highlight from './Highlight.svelte'
  import type { SearchResultLinkProps, SearchResultsProps } from './types.js'

  let {
    hits,
    view,
    activeIndex,
    onActivate,
    onOpen,
    onPrefetch,
    renderLink,
    action,
    emptyText,
    molId = 'search',
    className,
  }: SearchResultsProps<T> = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let listEl: HTMLUListElement | null = $state(null)

  // Keep the keyboard-active row in view.
  $effect(() => {
    if (activeIndex < 0) return
    const el = listEl?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    el?.scrollIntoView?.({ block: 'nearest' })
  })

  // The active row's announcement; empty when no row is keyboard-active.
  const activeHitText = (): string => {
    const hit = activeIndex >= 0 ? hits[activeIndex] : undefined
    if (!hit) return ''
    return t(
      'searchUi.activeResult',
      { title: view(hit.doc).title, position: activeIndex + 1, count: hits.length },
      { defaultValue: '{{title}}, {{position}} of {{count}}' },
    )
  }
</script>

{#if hits.length === 0}
  <p class={cm.resultEmpty} data-mol-id={`${molId}-empty`}>{emptyText}</p>
  <!-- The status region exists before results arrive, so it is live. -->
  <p role="status" class={cm.srOnly} data-mol-id={`${molId}-active`}></p>
{:else}
  <ul
    bind:this={listEl}
    aria-label={t('searchUi.results', undefined, { defaultValue: 'Search results' })}
    class={cm.cn(cm.resultList, className)}
    data-mol-id={`${molId}-results`}
  >
    {#each hits as hit, i (hit.id)}
      {@const v = view(hit.doc)}
      {@const active = i === activeIndex}
      {#snippet rowBody()}
        <!-- React's JSX keeps no text nodes between these spans, so every
             element and block here sits directly beside its neighbor. -->
        <span class={cm.flex({ align: 'baseline', wrap: 'wrap', gap: 2 })}
          ><span class={cm.cn(cm.resultTitle, v.mono && cm.resultTitleMono)}>
            <Highlight text={v.title} terms={hit.terms} />
          </span>{#if v.meta && v.meta.length}<span class={cm.resultMeta}>{v.meta.join(' · ')}</span
            >{/if}{#if hit.related}<span
              class={cm.resultMeta}
              data-mol-id={`${molId}-related`}
              title={t('searchUi.relatedTitle', undefined, {
                defaultValue: 'Matches the meaning of your search, not its words',
              })}
            >
              {t('searchUi.related', undefined, { defaultValue: 'related' })}
            </span>{/if}</span
        >{#if v.description}
          <span class={cm.cn(cm.resultDescription, cm.displayBlock)}>
            <Highlight text={v.description} terms={hit.terms} />
          </span>
        {/if}
      {/snippet}
      {@const linkProps: SearchResultLinkProps = {
        href: v.href,
        state: v.state,
        className: cm.resultBody,
        'data-mol-id': `${molId}-link`,
        children: rowBody,
        onClick: (event: MouseEvent) => {
          // A modified click opens a new tab; the router handles the rest.
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
            return
          event.preventDefault()
          onOpen(hit.doc)
        },
      }}
      <li
        aria-current={active ? 'true' : undefined}
        data-index={i}
        data-mol-id={`${molId}-hit`}
        data-hit-id={hit.id}
        class={cm.cn(cm.resultItem, active && cm.resultItemActive)}
        onpointerover={() => {
          onActivate?.(i)
          onPrefetch?.(hit.doc)
        }}
        onfocusin={() => onPrefetch?.(hit.doc)}
        ontouchstart={() => onPrefetch?.(hit.doc)}
      >
        {#if renderLink}
          {@render renderLink(linkProps)}
        {:else}
          <a
            href={linkProps.href}
            class={linkProps.className}
            data-mol-id={linkProps['data-mol-id']}
            onclick={linkProps.onClick}>{@render linkProps.children()}</a
          >
        {/if}
        {#if action}
          <span class={cm.resultAction}>{@render action(hit.doc)}</span>
        {/if}
      </li>
    {/each}
  </ul>
  <p role="status" class={cm.srOnly} data-mol-id={`${molId}-active`}>{activeHitText()}</p>
{/if}
