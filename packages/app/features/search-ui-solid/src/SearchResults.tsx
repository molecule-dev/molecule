/**
 * Solid ranked search results — the counterpart of
 * `@molecule/app-search-ui-react`'s `SearchResults`.
 *
 * @module
 */

import { createEffect, createMemo, For, type JSX, onCleanup, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { webHover } from '@molecule/app-ui-solid'

import { Highlight } from './Highlight.jsx'
import type { SearchResultHit, SearchResultLinkProps, SearchResultsProps } from './types.js'

/**
 * The default row link: a plain anchor. Apps pass a router link instead; the
 * opaque `state` is theirs to consume and never reaches the DOM.
 *
 * @param linkProps - The link props.
 * @returns The anchor.
 */
const defaultLink = (linkProps: SearchResultLinkProps): JSX.Element => {
  const { state: _state, children, className, ...rest } = linkProps
  return (
    <a {...rest} class={className}>
      {children}
    </a>
  )
}

/** One stable record per hit id, created on first sight (React keys rows by the hit's id). */
interface Row {
  id: string
}

/**
 * The ranked hits: title and description with the matched terms marked, the
 * meta line, hover making a row active and warming its page. The whole row is
 * the link, so the list is a plain list of links (no listbox roles: an
 * option's children are presentational and would hide the row's link and
 * action); the active row is marked with `aria-current` on its `<li>` and
 * announced through a polite, visually hidden status region after the list.
 *
 * React keys each row by the hit's `id` value, so a re-passed or re-ordered
 * array keeps the rendered rows per id. Solid's `For` keys by reference, so
 * the rows are keyed through stable per-id records: the record for an id is
 * created once and reused, while the row's content reads the CURRENT hit for
 * that id reactively.
 *
 * @param props - See {@link SearchResultsProps}.
 * @returns The list, or the empty state.
 */
export const SearchResults = <T,>(props: SearchResultsProps<T>): JSX.Element => {
  const cm = getClassMap()
  const { t } = useTranslation()
  // React's default parameter: the ids carry the `search` prefix unless overridden.
  const molId = (): string => props.molId ?? 'search'
  // The rendered rows' elements, by the id of the hit each one shows.
  const rowEls = new Map<string, HTMLLIElement>()
  onCleanup(() => rowEls.clear())

  // Keep the active row in view: when it first renders, and whenever the
  // active hit changes (a new result list can replace the row under an index
  // that stays the same). React's effect depends on the active row's index and
  // on the hit at it, so both are compared by value: receiving the same
  // results in a new props object is not a new active row.
  const activeIndex = createMemo(() => props.activeIndex)
  const activeId = createMemo<string | undefined>(() => {
    const index = activeIndex()
    return index >= 0 ? props.hits[index]?.id : undefined
  })
  createEffect(() => {
    const index = activeIndex()
    const id = activeId()
    if (index < 0 || id === undefined) return
    rowEls.get(id)?.scrollIntoView?.({ block: 'nearest' })
  })

  const records = new Map<string, Row>()
  const keyedHits = (): Row[] => {
    const seen = new Set<string>()
    const rows = props.hits.map((hit) => {
      seen.add(hit.id)
      let row = records.get(hit.id)
      if (!row) {
        row = { id: hit.id }
        records.set(hit.id, row)
      }
      return row
    })
    for (const id of [...records.keys()]) if (!seen.has(id)) records.delete(id)
    return rows
  }
  const hitFor = (id: string): SearchResultHit<T> =>
    props.hits.find((hit) => hit.id === id) as SearchResultHit<T>

  /**
   * The active row's announcement; empty when no row is keyboard-active.
   *
   * @returns The status text.
   */
  const activeText = (): string => {
    const hit = props.activeIndex >= 0 ? props.hits[props.activeIndex] : undefined
    if (!hit) return ''
    return t(
      'searchUi.activeResult',
      {
        title: props.view(hit.doc).title,
        position: props.activeIndex + 1,
        count: props.hits.length,
      },
      { defaultValue: '{{title}}, {{position}} of {{count}}' },
    )
  }

  /**
   * Builds the row body the link carries: the title and meta line, then the
   * description, with the matched terms marked.
   *
   * @param hit - The hit.
   * @param v - The hit's view.
   * @returns The body.
   */
  const bodyOf = (hit: SearchResultHit<T>, v: ReturnType<typeof props.view>): JSX.Element => {
    const meta = [...(v.meta ?? [])]
    return (
      <>
        <span class={cm.flex({ align: 'baseline', wrap: 'wrap', gap: 2 })}>
          <span class={cm.cn(cm.resultTitle, v.mono && cm.resultTitleMono)}>
            <Highlight text={v.title} terms={hit.terms} />
          </span>
          {meta.length ? <span class={cm.resultMeta}>{meta.join(' · ')}</span> : null}
          {hit.related ? (
            <span
              class={cm.resultMeta}
              data-mol-id={`${molId()}-related`}
              title={t('searchUi.relatedTitle', undefined, {
                defaultValue: 'Matches the meaning of your search, not its words',
              })}
            >
              {t('searchUi.related', undefined, { defaultValue: 'related' })}
            </span>
          ) : null}
        </span>
        {v.description ? (
          <span class={cm.cn(cm.resultDescription, cm.displayBlock)}>
            <Highlight text={v.description} terms={hit.terms} />
          </span>
        ) : null}
      </>
    )
  }

  /**
   * Builds the link props one row's link gets, closing over the hit so a
   * plain click opens it.
   *
   * @param hit - The hit.
   * @param v - The hit's view.
   * @returns The link props.
   */
  const linkPropsOf = (
    hit: SearchResultHit<T>,
    v: ReturnType<typeof props.view>,
  ): SearchResultLinkProps => ({
    href: v.href,
    state: v.state,
    className: cm.resultBody,
    'data-mol-id': `${molId()}-link`,
    children: bodyOf(hit, v),
    onClick: (event: MouseEvent) => {
      // A modified click opens a new tab; the router handles the rest.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
        return
      event.preventDefault()
      props.onOpen(hit.doc)
    },
  })

  return (
    <Show
      when={props.hits.length === 0}
      fallback={
        <>
          <ul
            aria-label={t('searchUi.results', undefined, { defaultValue: 'Search results' })}
            class={cm.cn(cm.resultList, props.className)}
            data-mol-id={`${molId()}-results`}
          >
            <For each={keyedHits()}>
              {(row) => {
                const index = (): number => props.hits.findIndex((h) => h.id === row.id)
                const hit = (): SearchResultHit<T> => hitFor(row.id)
                const v = (): ReturnType<typeof props.view> => props.view(hit().doc)
                // The row's element leaves with the row (React's per-row ref is
                // called with `null` as the row unmounts).
                onCleanup(() => rowEls.delete(row.id))
                return (
                  <li
                    // React's per-row ref: the row's element, by the id of its hit.
                    ref={(host) => {
                      rowEls.set(row.id, host)
                      webHover(host, () => ({
                        onEnter: () => {
                          props.onActivate?.(index())
                          props.onPrefetch?.(hit().doc)
                        },
                      }))
                    }}
                    aria-current={index() === props.activeIndex ? 'true' : undefined}
                    data-index={index()}
                    data-mol-id={`${molId()}-hit`}
                    data-hit-id={row.id}
                    class={cm.cn(
                      cm.resultItem,
                      index() === props.activeIndex && cm.resultItemActive,
                    )}
                    onFocusIn={() => props.onPrefetch?.(hit().doc)}
                    onTouchStart={() => props.onPrefetch?.(hit().doc)}
                  >
                    {props.renderLink
                      ? props.renderLink(linkPropsOf(hit(), v()))
                      : defaultLink(linkPropsOf(hit(), v()))}
                    {props.action ? (
                      <span class={cm.resultAction}>{props.action(hit().doc)}</span>
                    ) : null}
                  </li>
                )
              }}
            </For>
          </ul>
          <p role="status" class={cm.srOnly} data-mol-id={`${molId()}-active`}>
            {activeText()}
          </p>
        </>
      }
    >
      <>
        <p class={cm.resultEmpty} data-mol-id={`${molId()}-empty`}>
          {props.emptyText}
        </p>
        {/* The status region exists before results arrive, so it is live. */}
        <p role="status" class={cm.srOnly} data-mol-id={`${molId()}-active`} />
      </>
    </Show>
  )
}
