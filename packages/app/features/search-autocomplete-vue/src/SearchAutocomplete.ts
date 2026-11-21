/**
 * Vue search input with a typeahead suggestion popover.
 *
 * @module
 */

import {
  defineComponent,
  h,
  type PropType,
  ref,
  shallowRef,
  type VNode,
  type VNodeChild,
  watch,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Input } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { SuggestionItem } from './types.js'

/**
 * A suggestion as it arrives in props: node-valued fields are whatever the
 * caller (or the conformance node builder) put there, narrowed at render time.
 */
interface SuggestionInput {
  id: string
  label: unknown
  meta?: unknown
  data?: unknown
}

/** Counter backing the per-instance ids (React's `useId()`). */
let nextGeneratedId = 0

/**
 * The children a node value contributes: an array stays a list of siblings, a
 * single node is one child, and an absent value contributes nothing — the way
 * React renders `{node}`.
 *
 * @param value - A node value.
 * @returns The child nodes.
 */
const childrenOf = (value: VNodeChild): VNodeChild[] => {
  if (value === null || value === undefined || value === false) return []
  return Array.isArray(value) ? value : [value]
}

/**
 * Search input with a typeahead suggestions popover. Pass either
 * `onSearch` (async fetch with debounce) or `suggestions` (controlled).
 *
 * Vue counterpart of `@molecule/app-search-autocomplete-react`'s
 * `SearchAutocomplete` — the same props (React names), the same ClassMap
 * tokens, the same DOM for the same input, and the same callback calls.
 *
 * @param props - Component props (see {@link SearchAutocompleteProps}).
 * @returns The search-autocomplete component.
 */
export const SearchAutocomplete = defineComponent({
  name: 'SearchAutocomplete',
  // As in React (which never spreads unknown props onto an element): a prop
  // this component does not declare must not leak onto the wrapper.
  inheritAttrs: false,
  props: {
    value: {
      type: String,
      required: true,
    },
    onChange: {
      type: Function as PropType<(value: string) => void>,
      default: undefined,
    },
    onSearch: {
      type: Function as PropType<(query: string) => Promise<SuggestionItem[]> | SuggestionItem[]>,
      default: undefined,
    },
    suggestions: {
      type: Array as PropType<SuggestionInput[]>,
      default: undefined,
    },
    onSelect: {
      type: Function as PropType<(item: SuggestionItem<unknown>) => void>,
      default: undefined,
    },
    placeholder: String,
    ariaLabel: String,
    debounceMs: {
      type: Number,
      default: 200,
    },
    minChars: {
      type: Number,
      default: 1,
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const internal = shallowRef<SuggestionItem[]>([])
    const open = ref(false)
    const activeIndex = ref(-1)
    const wrapper = ref<HTMLDivElement | null>(null)
    // Monotonic id of the latest in-flight `onSearch`. A response only applies
    // if its token still equals the latest — the stale-response race guard.
    let request = 0
    const baseId = `mol-search-autocomplete-${nextGeneratedId++}`
    const listId = `${baseId}-listbox`

    /**
     * Stable DOM id for the option at `index` (referenced by aria-activedescendant).
     * @param index - Option position.
     * @returns The option id.
     */
    const optionId = (index: number): string => `${baseId}-option-${index}`

    /** The suggestion list: the caller's controlled list wins over fetched results. */
    const list = (): SuggestionInput[] => props.suggestions ?? internal.value

    /** The popover is only visible with open + at least one suggestion. */
    const isExpanded = (): boolean => open.value && list().length > 0

    /**
     * The highlight clamped to the current list: a list that shrinks below the
     * highlighted index leaves the old option id pointing at nothing, so every
     * read of the index (activedescendant, the highlighted option, Enter) sees
     * -1 — nothing highlighted — instead of naming an option that is gone.
     *
     * @returns The active index, or -1 when nothing is highlighted.
     */
    const active = (): number => {
      const index = activeIndex.value
      return index < list().length ? index : -1
    }

    // React's debounced `onSearch` effect: a new value/search/debounce/minChars
    // restarts the timer; a query shorter than minChars clears the results.
    watch(
      () => [props.value, props.onSearch, props.debounceMs, props.minChars] as const,
      ([value, onSearch, debounceMs, minChars], _previous, onCleanup) => {
        if (!onSearch || value.length < minChars) {
          internal.value = []
          return
        }
        const timer = setTimeout(() => {
          const token = ++request
          Promise.resolve(onSearch(value))
            .then((result) => {
              // Drop a response that lost the race: only the LATEST request may
              // apply, so a slow earlier fetch can't clobber fresher results.
              if (token === request) internal.value = result
            })
            .catch((_error) => {
              // Typeahead is best-effort — a failed suggestion fetch simply
              // yields no suggestions for THIS query. Guard on the token so an
              // out-of-order failure can't wipe a fresher successful result.
              if (token === request) internal.value = []
            })
        }, debounceMs)
        onCleanup(() => clearTimeout(timer))
      },
      { immediate: true },
    )

    // A new query resets the keyboard highlight (works for both the internal
    // and the controlled `suggestions` data modes).
    watch(
      () => props.value,
      () => {
        activeIndex.value = -1
      },
    )

    // React's outside-mousedown effect: the listener exists only while open.
    watch(open, (isOpen, _previous, onCleanup) => {
      if (!isOpen) return
      /**
       * Closes the dropdown when a click occurs outside the wrapper element.
       * @param event - The document mousedown.
       */
      const onDoc = (event: MouseEvent): void => {
        if (!wrapper.value?.contains(event.target as Node)) {
          open.value = false
          activeIndex.value = -1
        }
      }
      document.addEventListener('mousedown', onDoc)
      onCleanup(() => document.removeEventListener('mousedown', onDoc))
    })

    /**
     * Commits a suggestion selection and closes the popover.
     * @param item - The chosen suggestion.
     */
    function select(item: SuggestionInput): void {
      props.onSelect?.(item as SuggestionItem)
      open.value = false
      activeIndex.value = -1
    }

    /**
     * Full keyboard support for the combobox: ArrowDown/ArrowUp move the
     * highlight (opening the popover if needed), Enter selects the highlighted
     * option, Escape closes.
     * @param event - The keyboard event from the input.
     */
    function onKeyDown(event: KeyboardEvent): void {
      const current = list()
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (!open.value) {
          if (current.length > 0) open.value = true
          return
        }
        if (current.length === 0) return
        activeIndex.value = (activeIndex.value + 1) % current.length
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (!open.value) {
          if (current.length > 0) open.value = true
          return
        }
        if (current.length === 0) return
        activeIndex.value = activeIndex.value <= 0 ? current.length - 1 : activeIndex.value - 1
      } else if (event.key === 'Enter') {
        if (isExpanded() && active() >= 0) {
          event.preventDefault()
          select(current[active()] as SuggestionInput)
        }
      } else if (event.key === 'Escape') {
        if (open.value) {
          event.preventDefault()
          open.value = false
          activeIndex.value = -1
        }
      }
    }

    return (): VNode => {
      const current = list()
      const expanded = isExpanded()
      return h(
        'div',
        {
          ref: wrapper,
          class: cm.cn(cm.position('relative'), props.className),
        },
        [
          h(Input, {
            type: 'search',
            value: props.value,
            onChange: (event: Event) => {
              props.onChange?.((event.target as HTMLInputElement).value)
              open.value = true
            },
            onFocus: () => {
              if (props.value.length >= props.minChars) open.value = true
            },
            onKeyDown: onKeyDown,
            placeholder:
              props.placeholder ?? t('search.placeholder', {}, { defaultValue: 'Search…' }),
            role: 'combobox',
            'aria-label':
              props.ariaLabel ?? t('search.aria.label', undefined, { defaultValue: 'Search' }),
            'aria-autocomplete': 'list',
            'aria-expanded': expanded ? 'true' : 'false',
            'aria-controls': listId,
            'aria-activedescendant': expanded && active() >= 0 ? optionId(active()) : undefined,
          }),
          expanded
            ? h(
                'ul',
                {
                  role: 'listbox',
                  id: listId,
                  class: cm.cn(cm.stack(0), cm.sp('p', 1)),
                  style: {
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    right: '0',
                    zIndex: '50',
                    background: 'var(--color-surface, #fff)',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    maxHeight: '320px',
                    overflowY: 'auto',
                  },
                },
                current.map((suggestion, index) =>
                  h(
                    'li',
                    {
                      key: suggestion.id,
                      id: optionId(index),
                      role: 'option',
                      'aria-selected': index === active() ? 'true' : 'false',
                      tabindex: -1,
                      'data-mol-id': 'search-autocomplete-option',
                      onMouseenter: () => {
                        activeIndex.value = index
                      },
                      // Pointer selection happens on press: preventDefault keeps
                      // DOM focus on the input, which owns the combobox.
                      onMousedown: (event: MouseEvent) => {
                        event.preventDefault()
                        select(suggestion)
                      },
                      class: cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.cursorPointer,
                        index === active() && cm.surfaceSecondary,
                      ),
                    },
                    [
                      h(
                        'div',
                        { class: cm.fontWeight('medium') },
                        childrenOf(suggestion.label as VNodeChild),
                      ),
                      suggestion.meta
                        ? h(
                            'div',
                            { class: cm.textSize('xs') },
                            childrenOf(suggestion.meta as VNodeChild),
                          )
                        : null,
                    ],
                  ),
                ),
              )
            : null,
        ],
      )
    }
  },
})
