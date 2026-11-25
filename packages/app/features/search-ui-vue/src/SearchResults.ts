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
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
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

/** One row's hover state, kept for as long as its element is rendered. */
interface HoverState {
  /** A mouse or a pen is over the row. */
  inside: boolean
  /** The last entry was a finger, so the mouse event a browser sends after it is not a hover. */
  fromTouch: boolean
}

/** Each row's hover state, by its element. */
const hoverStates = new WeakMap<Element, HoverState>()

/**
 * Whether a row's `over` or `out` event crossed the row's edge. React derives
 * its enter and leave events from these pairs through `relatedTarget`, so a
 * move between two of the row's own children is neither.
 *
 * @param event - The row's pointer or mouse `over`/`out` event.
 * @returns True when the other end of the move lies outside the row.
 */
const crossesRowEdge = (event: MouseEvent | PointerEvent): boolean => {
  const other = event.relatedTarget
  return !(other instanceof Node && (event.currentTarget as Node).contains(other))
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

    /**
     * Handles a row's pointer or mouse `over` and `out` events the way React's
     * kit handles its `onMouseEnter`: a mouse or a pen entering makes the row
     * active and warms its page once per entry. A finger is not a hover, and
     * neither is the mouse event a browser sends after one.
     *
     * @param entered - Whether the pointer moved onto the row (true) or off it.
     * @param index - The row's index.
     * @param hit - The row's hit.
     * @returns The row's event handler.
     */
    const onRowHover =
      (entered: boolean, index: number, hit: SearchResultHit<unknown>) =>
      (event: MouseEvent | PointerEvent): void => {
        if (!crossesRowEdge(event)) return
        const row = event.currentTarget as HTMLElement
        const state = hoverStates.get(row) ?? { inside: false, fromTouch: false }
        hoverStates.set(row, state)
        if ('pointerType' in event) {
          state.fromTouch = event.pointerType === 'touch'
          if (state.fromTouch) return
        } else if (state.fromTouch) {
          // A compatibility mouse entry after a touch is not a hover.
          return
        }
        if (state.inside === entered) return
        state.inside = entered
        if (entered) {
          props.onActivate?.(index)
          props.onPrefetch?.(hit.doc)
        }
      }

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
        return h(
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
            onPointerover: onRowHover(true, i, hit),
            onPointerout: onRowHover(false, i, hit),
            onMouseover: onRowHover(true, i, hit),
            onMouseout: onRowHover(false, i, hit),
            onFocusin: () => props.onPrefetch?.(hit.doc),
            onTouchstart: () => props.onPrefetch?.(hit.doc),
          },
          [
            link,
            props.action ? h('span', { class: cm.resultAction }, [props.action(hit.doc)]) : null,
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
