/**
 * Vue quick-search dialog — the counterpart of
 * `@molecule/app-search-ui-react`'s `QuickSearchDialog`.
 *
 * @module
 */

import {
  defineComponent,
  h,
  nextTick,
  onMounted,
  type PropType,
  type Ref,
  toValue,
  type VNodeChild,
  watch,
} from 'vue'

import type { ClientSearchDocument } from '@molecule/app-client-search'
import type { SearchSession } from '@molecule/app-client-search-vue'
import { getClassMap } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import { Kbd } from './Kbd.js'
import { SearchBox } from './SearchBox.js'
import { SearchResults } from './SearchResults.js'
import type { SearchResultLinkProps, SearchResultView } from './types.js'

/**
 * Reads a session field, unwrapping the reactive container a Vue session
 * holds it in (`Ref`/`ComputedRef`) and passing a plain value through, so the
 * dialog takes a session from `useSearchSession` or a plain object alike.
 *
 * @param value - The session field.
 * @returns The value.
 */
const read = <T>(value: Ref<T> | T): T => toValue(value)

/**
 * Whether a value is a search document, so a hit handed back by the list can
 * reach the session's typed `open`/`prefetch` without a cast.
 *
 * @param value - The hit's document.
 * @returns True for a record, which is what a `ClientSearchDocument` is.
 */
const isDocument = (value: unknown): value is ClientSearchDocument =>
  typeof value === 'object' && value !== null

/**
 * A search dialog for `mod+k`: the box on top with focus, the hits below in
 * a scrolling pane, and the key hints in the footer. Before anything is
 * typed the pane shows `idleText` rather than a browse list. Enter opens the active
 * hit through the session (which closes the dialog by the caller's `onOpen`).
 * The dialog is named for screen readers through `label` (or the translated
 * "Search" default).
 *
 * @param props - See {@link QuickSearchDialogProps}.
 * @returns The dialog component.
 */
export const QuickSearchDialog = defineComponent({
  name: 'QuickSearchDialog',
  props: {
    open: { type: Boolean, required: true },
    onClose: { type: Function as PropType<() => void>, required: true },
    session: {
      type: Object as PropType<SearchSession<ClientSearchDocument>>,
      required: true,
    },
    view: {
      type: Function as PropType<(doc: unknown) => SearchResultView>,
      required: true,
    },
    placeholder: { type: String, required: true },
    examples: { type: Array as PropType<string[]>, default: undefined },
    emptyText: { type: String, required: true },
    idleText: { type: String, default: undefined },
    renderLink: {
      type: Function as PropType<((linkProps: SearchResultLinkProps) => VNodeChild) | undefined>,
      default: undefined,
    },
    label: { type: String, default: undefined },
    molId: { type: String, default: 'quick-search' },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    // The dialog pattern: focus moves into the field when it opens. The input
    // is mounted only while open, so the focus waits one tick for the field
    // to exist (React's effect runs after the child mounts).
    const focusField = (): void => {
      if (props.open) props.session.inputRef.current?.focus()
    }
    onMounted(focusField)
    watch(
      () => props.open,
      () => {
        nextTick(focusField)
      },
    )

    return (): VNodeChild => {
      if (!props.open) return null
      const active = read(props.session.active)
      const hits = read(props.session.hits)
      return h(
        Modal,
        {
          open: props.open,
          onClose: props.onClose,
          size: 'lg',
          closeOnEscape: false,
          showCloseButton: false,
          closeLabel: t('searchUi.close', undefined, { defaultValue: 'Close' }),
          'aria-label':
            props.label ?? t('searchUi.dialogLabel', undefined, { defaultValue: 'Search' }),
          'data-mol-id': props.molId,
        },
        {
          default: () => [
            h(SearchBox, {
              value: read(props.session.query),
              onChange: (value: string) => props.session.setQuery(value),
              onKeyDown: (event: KeyboardEvent) => props.session.onKeyDown(event),
              inputRef: props.session.inputRef,
              placeholder: props.placeholder,
              count: active ? hits.length : undefined,
              filters: read(props.session.parsed).filters,
              onRemoveFilter: (index: number) => props.session.removeFilter(index),
              onClear: () => props.session.clear(),
              examples: props.examples,
              shortcut: null,
              molId: props.molId,
            }),
            h('div', { class: cm.dialogBody, 'data-mol-id': `${props.molId}-pane` }, [
              h(SearchResults, {
                hits: active ? hits : [],
                view: props.view,
                activeIndex: read(props.session.activeIndex),
                onActivate: (index: number) => props.session.setActiveIndex(index),
                onOpen: (doc: unknown) => {
                  if (isDocument(doc)) props.session.open(doc)
                },
                onPrefetch: (doc: unknown) => {
                  if (isDocument(doc)) props.session.prefetch(doc)
                },
                renderLink: props.renderLink,
                emptyText: active ? props.emptyText : (props.idleText ?? props.emptyText),
                molId: props.molId,
              }),
            ]),
            h(
              'p',
              {
                class: cm.cn(cm.dialogFooter, cm.resultMeta),
                'data-mol-id': `${props.molId}-keys`,
              },
              [
                h(Kbd, () => ['↑']),
                ' ',
                h(Kbd, () => ['↓']),
                ' ',
                h(Kbd, () => ['↵']),
                ' ',
                h(Kbd, () => ['esc']),
                ' ',
                t('searchUi.dialogKeys', undefined, {
                  defaultValue:
                    'The arrow keys move through the results, Enter opens one, Escape closes.',
                }),
              ],
            ),
          ],
        },
      )
    }
  },
})
