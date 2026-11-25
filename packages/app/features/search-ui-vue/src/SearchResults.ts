/**
 * Vue ranked search results — the counterpart of
 * `@molecule/app-search-ui-react`'s `SearchResults`.
 *
 * @module
 */

import {
  type ComponentPublicInstance,
  defineComponent,
  h,
  onMounted,
  type PropType,
  type VNodeChild,
  watch,
  withDirectives,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { vWebHover } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import { Highlight } from './Highlight.js'
import type { SearchResultHit, SearchResultLinkProps, SearchResultView } from './types.js'

/**
 * The default row link: a plain anchor. Apps pass a router link instead; the
 * opaque `state` is theirs to consume and never reaches the DOM.
 *
 * @param linkProps - The link props.
 * @returns The anchor.
 */
const defaultLink = (linkProps: SearchResultLinkProps): VNodeChild => {
  const { state: _state, children, className, ...rest } = linkProps
  return h('a', { ...rest, class: className }, Array.isArray(children) ? children : [children])
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
 * @returns The results component.
 */
export const SearchResults = defineComponent({
  name: 'SearchResults',
  props: {
    hits: { type: Array as PropType<SearchResultHit<unknown>[]>, required: true },
    view: {
      type: Function as PropType<(doc: unknown) => SearchResultView>,
      required: true,
    },
    activeIndex: { type: Number, required: true },
    onActivate: {
      type: Function as PropType<((index: number) => void) | undefined>,
      default: undefined,
    },
    onOpen: { type: Function as PropType<(doc: unknown) => void>, required: true },
    onPrefetch: {
      type: Function as PropType<((doc: unknown) => void) | undefined>,
      default: undefined,
    },
    renderLink: {
      type: Function as PropType<((linkProps: SearchResultLinkProps) => VNodeChild) | undefined>,
      default: undefined,
    },
    action: {
      type: Function as PropType<((doc: unknown) => VNodeChild) | undefined>,
      default: undefined,
    },
    emptyText: { type: String, required: true },
    molId: { type: String, default: 'search' },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    // The rendered rows, by the id of the hit each one shows.
    const rows = new Map<string, HTMLElement>()

    /** The id of the hit at the active index. */
    const activeId = (): string | undefined =>
      props.activeIndex >= 0 ? props.hits[props.activeIndex]?.id : undefined

    // Keep the active row in view: when it first renders, and whenever the
    // active hit changes (a new result list can replace the row under an
    // index that stays the same).
    const keepInView = (): void => {
      const id = activeId()
      const row = id === undefined ? undefined : rows.get(id)
      row?.scrollIntoView?.({ block: 'nearest' })
    }
    onMounted(keepInView)
    watch([activeId, () => props.activeIndex], keepInView, { flush: 'post' })

    return (): VNodeChild => {
      if (!props.hits.length) {
        return [
          h('p', { class: cm.resultEmpty, 'data-mol-id': `${props.molId}-empty` }, [
            props.emptyText,
          ]),
          // The status region exists before results arrive, so it is live.
          h('p', { role: 'status', class: cm.srOnly, 'data-mol-id': `${props.molId}-active` }),
        ]
      }

      // The active row's announcement; empty when no row is keyboard-active.
      const activeHit = props.activeIndex >= 0 ? props.hits[props.activeIndex] : undefined
      const activeText = activeHit
        ? t(
            'searchUi.activeResult',
            {
              title: props.view(activeHit.doc).title,
              position: props.activeIndex + 1,
              count: props.hits.length,
            },
            { defaultValue: '{{title}}, {{position}} of {{count}}' },
          )
        : ''

      const listItems: VNodeChild[] = props.hits.map((hit, i) => {
        const v = props.view(hit.doc)
        const active = i === props.activeIndex
        const meta = [...(v.meta ?? [])]
        const body: VNodeChild[] = [
          h('span', { class: cm.flex({ align: 'baseline', wrap: 'wrap', gap: 2 }) }, [
            h('span', { class: cm.cn(cm.resultTitle, v.mono && cm.resultTitleMono) }, [
              h(Highlight, { text: v.title, terms: hit.terms }),
            ]),
            meta.length ? h('span', { class: cm.resultMeta }, [meta.join(' · ')]) : null,
            hit.related
              ? h(
                  'span',
                  {
                    class: cm.resultMeta,
                    'data-mol-id': `${props.molId}-related`,
                    title: t('searchUi.relatedTitle', undefined, {
                      defaultValue: 'Matches the meaning of your search, not its words',
                    }),
                  },
                  [t('searchUi.related', undefined, { defaultValue: 'related' })],
                )
              : null,
          ]),
          v.description
            ? h('span', { class: cm.cn(cm.resultDescription, cm.displayBlock) }, [
                h(Highlight, { text: v.description, terms: hit.terms }),
              ])
            : null,
        ]
        const linkProps: SearchResultLinkProps = {
          href: v.href,
          state: v.state,
          className: cm.resultBody,
          'data-mol-id': `${props.molId}-link`,
          children: body,
          onClick: (event: MouseEvent) => {
            // A modified click opens a new tab; the router handles the rest.
            if (
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey ||
              event.button !== 0
            )
              return
            event.preventDefault()
            props.onOpen(hit.doc)
          },
        }
        const link = props.renderLink ? props.renderLink(linkProps) : defaultLink(linkProps)
        return withDirectives(
          h(
            'li',
            {
              key: hit.id,
              // React's per-row ref: the row's element, by the id of its hit.
              ref: (el: Element | ComponentPublicInstance | null) => {
                if (el) rows.set(hit.id, el as HTMLElement)
                else rows.delete(hit.id)
              },
              'aria-current': active ? 'true' : undefined,
              'data-index': i,
              'data-mol-id': `${props.molId}-hit`,
              'data-hit-id': hit.id,
              class: cm.cn(cm.resultItem, active && cm.resultItemActive),
              onFocusin: () => props.onPrefetch?.(hit.doc),
              onTouchstart: () => props.onPrefetch?.(hit.doc),
            },
            [
              link,
              props.action ? h('span', { class: cm.resultAction }, [props.action(hit.doc)]) : null,
            ],
          ),
          [
            [
              vWebHover,
              {
                onEnter: () => {
                  props.onActivate?.(i)
                  props.onPrefetch?.(hit.doc)
                },
              },
            ],
          ],
        )
      })

      // React's root is a fragment: the list, then the status region that
      // announces the keyboard-active row to screen readers.
      return [
        h(
          'ul',
          {
            'aria-label': t('searchUi.results', undefined, { defaultValue: 'Search results' }),
            class: cm.cn(cm.resultList, props.className),
            'data-mol-id': `${props.molId}-results`,
          },
          listItems,
        ),
        h('p', { role: 'status', class: cm.srOnly, 'data-mol-id': `${props.molId}-active` }, [
          activeText,
        ]),
      ]
    }
  },
})
