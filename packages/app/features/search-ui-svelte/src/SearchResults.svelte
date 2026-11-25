<!--
  SearchResults: the Svelte counterpart of `@molecule/app-search-ui-react`'s
  `SearchResults` — the ranked hits with the matched terms marked, hover
  prefetch, and an optional action per row. The whole row is the link, so the
  list is a plain list of links (no listbox roles); the active row is marked
  with `aria-current` on its `li` and announced through a polite, visually
  hidden status region after the list. Apps pass a router link through
  `renderLink`.
-->
<script lang="ts" module>
  /**
   * Whether a row's `over` or `out` event crossed the row's edge. React derives
   * its enter and leave events from these pairs through `relatedTarget`, so a
   * move between two of the row's own children is neither.
   *
   * @param row - The row the event reached.
   * @param event - Its pointer or mouse `over`/`out` event.
   * @returns True when the other end of the move lies outside the row.
   */
  const crossesRowEdge = (row: Element, event: MouseEvent | PointerEvent): boolean => {
    const other = event.relatedTarget
    return !(other instanceof Node && row.contains(other))
  }
</script>

<script lang="ts" generics="T extends ClientSearchDocument">
  import { untrack } from 'svelte'
  import type { Action } from 'svelte/action'
  import { SvelteMap } from 'svelte/reactivity'

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

  /**
   * The rendered rows, by the id of the hit each one shows. It is an element registry, not
   * state: the effect below takes its row untracked, so the active row's index and id alone
   * decide when that runs.
   */
  const rows = new SvelteMap<string, HTMLLIElement>()

  /**
   * Registers a row's element under its hit's id for as long as the row is
   * rendered (React's per-row `ref`).
   *
   * @param node - The row's element.
   * @param id - The id of the hit the row shows.
   * @returns The action's update and teardown.
   */
  const registerRow: Action<HTMLLIElement, string> = (node, id) => {
    rows.set(id, node)
    return {
      update(next) {
        rows.delete(id)
        id = next
        rows.set(id, node)
      },
      destroy() {
        rows.delete(id)
      },
    }
  }

  // Keep the active row in view: when it first renders, and whenever the
  // active hit changes (a new result list can replace the row under an index
  // that stays the same). React's effect depends on the active row's index
  // and on the hit at it, so both are compared by value: receiving the same
  // results in a new props object is not a new active row.
  const activeRowIndex = $derived(activeIndex)
  const activeHitId = $derived(activeRowIndex >= 0 ? hits[activeRowIndex]?.id : undefined)
  $effect(() => {
    if (activeRowIndex < 0 || activeHitId === undefined) return
    untrack(() => rows.get(activeHitId))?.scrollIntoView?.({ block: 'nearest' })
  })

  /**
   * Wires a row's hover the way React's kit wires its `onMouseEnter`: a mouse
   * or a pen entering the row calls `onEnter` once per entry, while a finger
   * is not a hover, and neither is the mouse event a browser sends after one.
   *
   * @param node - The row's element.
   * @param onEnter - What a hover entering the row does.
   * @returns The action's update and teardown.
   */
  const rowHover: Action<HTMLLIElement, () => void> = (node, onEnter) => {
    let inside = false
    let fromTouch = false
    /**
     * Routes one of the row's `over` and `out` events through its enter transition.
     *
     * @param entered - Whether the pointer moved onto the row (true) or off it.
     * @returns The event listener.
     */
    const handler =
      (entered: boolean) =>
      (event: PointerEvent | MouseEvent): void => {
        if (!crossesRowEdge(node, event)) return
        if ('pointerType' in event) {
          fromTouch = event.pointerType === 'touch'
          if (fromTouch) return
        } else if (fromTouch) {
          // A compatibility mouse entry after a touch is not a hover.
          return
        }
        if (inside === entered) return
        inside = entered
        if (entered) onEnter()
      }
    /**
     * Listens for one pointer or mouse event on the row.
     *
     * @param type - The event type (`pointerover`, `mouseout`, ...).
     * @param listener - Its handler.
     * @returns What stops the listener.
     */
    const listen = (
      type: string,
      listener: (event: PointerEvent | MouseEvent) => void,
    ): (() => void) => {
      const onEvent: EventListener = (event) => listener(event as PointerEvent | MouseEvent)
      node.addEventListener(type, onEvent)
      return () => node.removeEventListener(type, onEvent)
    }
    const stops = [
      listen('pointerover', handler(true)),
      listen('pointerout', handler(false)),
      listen('mouseover', handler(true)),
      listen('mouseout', handler(false)),
    ]
    return {
      update(next: () => void) {
        onEnter = next
      },
      destroy() {
        for (const stop of stops) stop()
      },
    }
  }

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
        use:registerRow={hit.id}
        aria-current={active ? 'true' : undefined}
        data-index={i}
        data-mol-id={`${molId}-hit`}
        data-hit-id={hit.id}
        class={cm.cn(cm.resultItem, active && cm.resultItemActive)}
        use:rowHover={() => {
          onActivate?.(i)
          onPrefetch?.(hit.doc)
        }}
        onfocusin={() => onPrefetch?.(hit.doc)}
        ontouchstart={() => onPrefetch?.(hit.doc)}
      >
        {#if renderLink}
          {@render renderLink?.(linkProps)}
        {:else}
          <a
            href={linkProps.href}
            class={linkProps.className}
            data-mol-id={linkProps['data-mol-id']}
            onclick={linkProps.onClick}>{@render linkProps.children?.()}</a
          >
        {/if}
        {#if action}
          <span class={cm.resultAction}>{@render action?.(hit.doc)}</span>
        {/if}
      </li>
    {/each}
  </ul>
  <p role="status" class={cm.srOnly} data-mol-id={`${molId}-active`}>{activeHitText()}</p>
{/if}
