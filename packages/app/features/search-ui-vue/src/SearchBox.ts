/**
 * Vue search field — the counterpart of `@molecule/app-search-ui-react`'s
 * `SearchBox`.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onMounted,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watch,
} from 'vue'

import type { ClientSearchFilter } from '@molecule/app-client-search'
import { getClassMap } from '@molecule/app-ui'
import { Icon, Tooltip } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import { Kbd } from './Kbd.js'
import type { SearchBoxProps } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const nodeOrSlot = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  if (prop === undefined || prop === null || prop === false) return []
  return Array.isArray(prop) ? prop : [prop]
}

/**
 * A search field: a leading icon, the input, a help icon that shows the
 * syntax on hover, an × to clear, and the shortcut cap; under it, whatever
 * `afterField` holds, then the active filters as removable chips and the
 * hit count. The field stays mounted, and its text with it, across searches.
 *
 * @param props - See {@link SearchBoxProps}.
 * @returns The field component.
 */
export const SearchBox = defineComponent({
  name: 'SearchBox',
  props: {
    value: { type: String, required: true },
    onChange: { type: Function as PropType<SearchBoxProps['onChange']>, required: true },
    onKeyDown: {
      type: Function as PropType<SearchBoxProps['onKeyDown']>,
      default: undefined,
    },
    inputRef: {
      type: Object as PropType<SearchBoxProps['inputRef']>,
      default: undefined,
    },
    placeholder: { type: String, required: true },
    label: { type: String, default: undefined },
    count: { type: Number, default: undefined },
    filters: { type: Array as PropType<ClientSearchFilter[]>, default: () => [] },
    onRemoveFilter: {
      type: Function as PropType<SearchBoxProps['onRemoveFilter']>,
      default: undefined,
    },
    onClear: { type: Function as PropType<SearchBoxProps['onClear']>, default: undefined },
    examples: { type: Array as PropType<string[]>, default: undefined },
    shortcut: { type: null, default: '/' },
    autoFocus: { type: Boolean, default: false },
    afterField: null,
    molId: { type: String, default: 'search' },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const focused = ref(false)

    // Focus the input on mount and whenever the ask (or the ref) changes, the
    // way React's effect keyed on `autoFocus` and `inputRef` does.
    const focusInput = (): void => {
      if (props.autoFocus) props.inputRef?.current?.focus()
    }
    onMounted(focusInput)
    watch([() => props.autoFocus, () => props.inputRef], focusInput)

    /**
     * Assigns the input element into `inputRef` so a shortcut can focus it,
     * and so the consumer reads the element React's `ref` would hand over.
     *
     * @param el - The input element, or `null` as it unmounts.
     */
    const inputRefFn = (el: unknown): void => {
      if (props.inputRef) props.inputRef.current = (el as HTMLInputElement | null) ?? null
    }

    /**
     * Reports the typed text, then restores the field to the value the props
     * still hold, the way React's controlled input renders it back when the
     * caller keeps the old one.
     *
     * @param event - The input event.
     */
    const onInput = (event: Event): void => {
      const el = event.target as HTMLInputElement
      props.onChange(el.value)
      el.value = props.value
    }

    /** Clears the text and puts focus back in the field, as React's button does. */
    const onClearClick = (): void => {
      props.onClear?.()
      props.inputRef?.current?.focus()
    }

    /**
     * Hands a key press to `onKeyDown` the way React's text field does. A legacy IME
     * reports key code 229 while it composes and on the Enter that confirms it, even
     * after composing ended: that Enter is cancelled first, so it submits nothing, and
     * the event reports the IME as composing. A composition still under way is the
     * IME's own and is handed over as it is.
     *
     * @param event - The input's keydown event.
     */
    const onKeydown = (event: KeyboardEvent): void => {
      const composing = event.isComposing
      const legacyComposition = event.keyCode === 229
      if (!composing && legacyComposition && event.key === 'Enter') event.preventDefault()
      if (legacyComposition) Object.defineProperty(event, 'isComposing', { value: true })
      props.onKeyDown?.(event)
    }

    return (): VNode => {
      const value = props.value
      const showCount = props.count !== undefined && value.trim().length > 0
      const showHelp = Boolean(props.examples?.length)
      const hasStatus = props.filters.length > 0 || showCount

      // The tooltip's content class keeps short labels on one line; the tips
      // are a sentence or two, so the inner block wraps on its own.
      const help = showHelp
        ? h('div', { class: cm.searchTips, style: { whiteSpace: 'normal', maxWidth: '360px' } }, [
            t('searchUi.syntax', undefined, {
              defaultValue: 'Narrow with a field, quote a phrase, or exclude a word:',
            }),
            ' ',
            ...[
              ...(props.examples ?? []),
              t('searchUi.examplePhrase', undefined, { defaultValue: '"exact phrase"' }),
              t('searchUi.exampleExcluded', undefined, { defaultValue: '-word' }),
            ].map((ex, i) => h('span', { key: ex }, [i > 0 ? ' · ' : '', h('code', null, [ex])])),
            ' · ',
            h(Kbd, () => ['↑']),
            ' ',
            h(Kbd, () => ['↓']),
            ' ',
            h(Kbd, () => ['↵']),
            ' ',
            t('searchUi.keys', undefined, {
              defaultValue: 'The arrow keys move through the results and Enter opens one.',
            }),
          ])
        : null

      const input = h('input', {
        ref: inputRefFn,
        type: 'search',
        value,
        onInput,
        // No handler, no listener: nothing is cancelled for a field without key handling.
        onKeydown: props.onKeyDown ? onKeydown : undefined,
        onFocusin: () => {
          focused.value = true
        },
        onFocusout: () => {
          focused.value = false
        },
        placeholder: props.placeholder,
        'aria-label': props.label ?? props.placeholder,
        autocomplete: 'off',
        autocorrect: 'off',
        spellcheck: 'false',
        enterkeyhint: 'search',
        class: cm.searchFieldInput,
        'data-mol-id': `${props.molId}-input`,
      })

      const actions: VNodeChild[] = [
        help
          ? h(
              Tooltip,
              { content: help, placement: 'bottom-end' },
              {
                default: () => [
                  h(
                    'button',
                    {
                      type: 'button',
                      'aria-label': t('searchUi.help', undefined, { defaultValue: 'Search tips' }),
                      class: cm.searchFieldClear,
                      'data-mol-id': `${props.molId}-help`,
                    },
                    [h(Icon, { name: 'question', size: 16 })],
                  ),
                ],
              },
            )
          : null,
        value && props.onClear
          ? h(
              'button',
              {
                type: 'button',
                onClick: onClearClick,
                'aria-label': t('searchUi.clear', undefined, { defaultValue: 'Clear search' }),
                class: cm.searchFieldClear,
                'data-mol-id': `${props.molId}-clear`,
              },
              [h('span', { 'aria-hidden': 'true' }, ['×'])],
            )
          : null,
        props.shortcut && !value && !focused.value ? h(Kbd, () => [props.shortcut]) : null,
      ]

      const statusRow = hasStatus
        ? h('div', { class: cm.searchStatusRow }, [
            ...props.filters.map((f, i) => {
              const text = `${f.negate ? '−' : ''}${f.field}: ${f.values.join(', ')}`
              return h(
                'button',
                {
                  key: `${f.field}:${f.values.join(',')}:${i}`,
                  type: 'button',
                  onClick: () => props.onRemoveFilter?.(i),
                  'aria-label': t(
                    'searchUi.removeFilter',
                    { filter: text },
                    {
                      defaultValue: 'Remove filter {{filter}}',
                    },
                  ),
                  class: cm.cn(cm.filterChip, f.negate && cm.filterChipNegated),
                  'data-mol-id': `${props.molId}-filter`,
                  'data-filter-field': f.field,
                },
                [text, h('span', { class: cm.filterChipRemove, 'aria-hidden': 'true' }, ['×'])],
              )
            }),
            h('span', { class: cm.mxAuto }),
            showCount
              ? h('span', { 'data-mol-id': `${props.molId}-count` }, [
                  t(
                    'searchUi.count',
                    { count: props.count },
                    { defaultValue: '{{count}} results' },
                  ),
                ])
              : null,
          ])
        : null

      return h('div', { 'data-mol-id': `${props.molId}-box` }, [
        h('div', { class: cm.cn(cm.searchField, props.className) }, [
          h('span', { class: cm.searchFieldIcon, 'aria-hidden': 'true' }, [
            h(Icon, { name: 'search', size: 18 }),
          ]),
          input,
          h('span', { class: cm.searchFieldActions }, actions),
        ]),
        ...nodeOrSlot(slots.afterField, props.afterField),
        statusRow,
      ])
    }
  },
})
