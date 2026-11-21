import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { useEffect, useRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Highlight } from './Highlight.js'

/** What the list needs from a hit. A session's hits already have this shape. */
export interface SearchResultHit<T> {
  id: string
  doc: T
  /** The matched terms, marked in the title and description. */
  terms: string[]
  /** Found by meaning rather than by the words typed. */
  related?: boolean
}

/** How one hit renders. */
export interface SearchResultView {
  /** Where the row goes. */
  href: string
  /** The row's title. */
  title: string
  /** Under the title, clamped to two lines. */
  description?: string
  /** Small facts after the title: type, category, source. */
  meta?: string[]
  /** Render the title in monospace (a package name). */
  mono?: boolean
  /** Opaque data handed to `renderLink` (router state). */
  state?: unknown
}

/** Props the row's link gets; `renderLink` turns them into an element. */
export interface SearchResultLinkProps {
  href: string
  className: string
  children: ReactNode
  onClick: (event: ReactMouseEvent<HTMLElement>) => void
  state?: unknown
  'data-mol-id': string
}

/** Props for {@link SearchResults}. */
export interface SearchResultsProps<T> {
  hits: SearchResultHit<T>[]
  /** How a hit renders. */
  view: (doc: T) => SearchResultView
  /** The keyboard- or pointer-active row, or `-1`. */
  activeIndex: number
  /** The pointer moved onto a row. */
  onActivate?: (index: number) => void
  /** A row was chosen (a plain click, or Enter elsewhere). Navigation is the caller's. */
  onOpen: (doc: T) => void
  /** The person is about to open a row (hover, focus, touch): warm its page. */
  onPrefetch?: (doc: T) => void
  /**
   * Renders the row's link. Defaults to a plain `<a>`; pass a router link to
   * keep navigation client-side (spread `props` onto it; `state` is optional).
   */
  renderLink?: (props: SearchResultLinkProps) => ReactNode
  /** Something at the row's end (an action button). */
  action?: (doc: T) => ReactNode
  /** Shown when there are no hits. */
  emptyText: string
  /** `data-mol-id` prefix: `<molId>-results`, `-hit`, `-link`, `-related`, `-empty`, `-active`. */
  molId?: string
  /** Extra classes composed onto the list. */
  className?: string
}

/**
 * The default row link: a plain anchor. Apps pass a router link instead.
 *
 * @param props - The link props.
 * @returns An `<a>`.
 */
function defaultLink(props: SearchResultLinkProps): ReactNode {
  const { state: _state, children, ...rest } = props
  return <a {...rest}>{children}</a>
}

/**
 * The ranked hits: title and description with the matched terms marked, the
 * meta line, hover making a row active and warming its page. The whole row is
 * the link, so the list is a plain list of links (no listbox roles: an
 * option's children are presentational and would hide the row's link and
 * action); the active row is marked with `aria-current` on its `<li>` and
 * announced through a polite, visually hidden status region after the list.
 *
 * @param props - See {@link SearchResultsProps}.
 * @returns The list and the status region, or the empty state and the (empty) region.
 */
export function SearchResults<T>({
  hits,
  view,
  activeIndex,
  onActivate,
  onOpen,
  onPrefetch,
  renderLink = defaultLink,
  action,
  emptyText,
  molId = 'search',
  className,
}: SearchResultsProps<T>): React.JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const listRef = useRef<HTMLUListElement | null>(null)

  // Keep the keyboard-active row in view.
  useEffect(() => {
    if (activeIndex < 0) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    el?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex])

  if (!hits.length) {
    return (
      <>
        <p className={cm.resultEmpty} data-mol-id={`${molId}-empty`}>
          {emptyText}
        </p>
        <p role="status" className={cm.srOnly} data-mol-id={`${molId}-active`} />
      </>
    )
  }

  // The active row's announcement; empty when no row is keyboard-active.
  const activeHit = activeIndex >= 0 ? hits[activeIndex] : undefined
  const activeText = activeHit
    ? t(
        'searchUi.activeResult',
        {
          title: view(activeHit.doc).title,
          position: activeIndex + 1,
          count: hits.length,
        },
        { defaultValue: '{{title}}, {{position}} of {{count}}' },
      )
    : ''

  return (
    <>
      <ul
        ref={listRef}
        aria-label={t('searchUi.results', undefined, { defaultValue: 'Search results' })}
        className={cm.cn(cm.resultList, className)}
        data-mol-id={`${molId}-results`}
      >
        {hits.map((hit, i) => {
          const v = view(hit.doc)
          const active = i === activeIndex
          const meta = [...(v.meta ?? [])]
          return (
            <li
              key={hit.id}
              aria-current={active ? true : undefined}
              data-index={i}
              data-mol-id={`${molId}-hit`}
              data-hit-id={hit.id}
              className={cm.cn(cm.resultItem, active && cm.resultItemActive)}
              onPointerEnter={() => {
                onActivate?.(i)
                onPrefetch?.(hit.doc)
              }}
              onFocus={() => onPrefetch?.(hit.doc)}
              onTouchStart={() => onPrefetch?.(hit.doc)}
            >
              {renderLink({
                href: v.href,
                state: v.state,
                className: cm.resultBody,
                'data-mol-id': `${molId}-link`,
                onClick: (e) => {
                  // A modified click opens a new tab; the router handles the rest.
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                  e.preventDefault()
                  onOpen(hit.doc)
                },
                children: (
                  <>
                    <span className={cm.flex({ align: 'baseline', wrap: 'wrap', gap: 2 })}>
                      <span className={cm.cn(cm.resultTitle, v.mono && cm.resultTitleMono)}>
                        <Highlight text={v.title} terms={hit.terms} />
                      </span>
                      {meta.length ? (
                        <span className={cm.resultMeta}>{meta.join(' · ')}</span>
                      ) : null}
                      {hit.related ? (
                        <span
                          className={cm.resultMeta}
                          data-mol-id={`${molId}-related`}
                          title={t('searchUi.relatedTitle', undefined, {
                            defaultValue: 'Matches the meaning of your search, not its words',
                          })}
                        >
                          {t('searchUi.related', undefined, { defaultValue: 'related' })}
                        </span>
                      ) : null}
                    </span>
                    {v.description ? (
                      <span className={cm.cn(cm.resultDescription, cm.displayBlock)}>
                        <Highlight text={v.description} terms={hit.terms} />
                      </span>
                    ) : null}
                  </>
                ),
              })}
              {action ? <span className={cm.resultAction}>{action(hit.doc)}</span> : null}
            </li>
          )
        })}
      </ul>
      <p role="status" className={cm.srOnly} data-mol-id={`${molId}-active`}>
        {activeText}
      </p>
    </>
  )
}
