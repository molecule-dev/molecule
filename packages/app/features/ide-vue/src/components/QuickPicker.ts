/**
 * Reusable quick picker overlay — used by Quick Open and the Command Palette.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `QuickPicker` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks. A filterable, keyboard-navigable list
 * rendered at the top-center of the viewport, above a click-away backdrop;
 * rows are ordered by a fuzzy score of the query, the highlighted row follows
 * the arrow keys and the pointer, and Enter selects it.
 *
 * The selected-row tint follows the theme primary (so a rebranded app tints
 * its own picker), never a literal blue; the hex is only the CSS-var fallback.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import {
  computed,
  defineComponent,
  h,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watch,
} from 'vue'

import { fuzzyScore } from '@molecule/app-ide-panel-logic/panels'
import { getClassMap, type OverlayTarget } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-vue'
import { useThemeMode, useTranslation } from '@molecule/app-vue'

import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'

/** An item in the quick picker list. */
export interface QuickPickerItem {
  /** Unique identifier. */
  id: string
  /** Primary label. */
  label: string
  /** Secondary text shown beside the label. */
  detail?: string
  /** Optional icon node. */
  icon?: VNodeChild
}

/**
 * Properties for the reusable quick picker overlay — React's contract, the
 * React prop names.
 */
export interface QuickPickerProps {
  /** Items to display and filter. */
  items: QuickPickerItem[]
  /** Placeholder text for the search input. */
  placeholder?: string
  /** Called when the user selects an item. */
  onSelect: (item: QuickPickerItem) => void
  /** Called when the user dismisses the picker (Escape or backdrop click). */
  onDismiss: () => void
  /** Show a loading indicator. */
  loading?: boolean
  /** Pre-fill the search input. */
  initialQuery?: string
  className?: string
}

/**
 * Mirrors React onto the search field: React keeps the `value` ATTRIBUTE in
 * step with the controlled value (the DOM property alone is not enough for
 * the same serialized markup).
 *
 * @param vnode - The input's vnode.
 */
function syncValueAttr(vnode: VNode): void {
  const el = vnode.el as HTMLInputElement | null
  if (el) el.setAttribute('value', el.value)
}

/**
 * Quick picker overlay with keyboard navigation.
 *
 * @param props - See {@link QuickPickerProps}.
 * @returns The rendered quick picker.
 */
export const QuickPicker = defineComponent({
  name: 'QuickPicker',
  inheritAttrs: false,
  props: {
    /** Items to display and filter. */
    items: { type: Array as PropType<QuickPickerItem[]>, required: true },
    /** Placeholder text for the search input. */
    placeholder: { type: String, required: false, default: undefined },
    /** Called when the user selects an item. */
    onSelect: { type: Function as PropType<(item: QuickPickerItem) => void>, required: true },
    /** Called when the user dismisses the picker (Escape or backdrop click). */
    onDismiss: { type: Function as PropType<() => void>, required: true },
    /** Show a loading indicator. */
    loading: { type: Boolean, required: false, default: undefined },
    /** Pre-fill the search input. */
    initialQuery: { type: String, required: false, default: undefined },
    className: { type: String, required: false, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const mode = useThemeMode()
    const isNarrow = useNarrowViewport()
    const isCoarse = useCoarsePointer()
    const query = ref(props.initialQuery ?? '')
    const selectedIndex = ref(0)
    const inputRef = ref<HTMLInputElement | null>(null)
    const listRef = ref<HTMLDivElement | null>(null)

    const inputTarget: OverlayTarget = {
      get current() {
        return inputRef.value
      },
    }

    // Filter and sort items by fuzzy match
    const filtered = computed<QuickPickerItem[]>(() => {
      if (!query.value.trim()) return props.items
      const scored = props.items
        .map((item) => ({ item, score: fuzzyScore(query.value, item.label) }))
        .filter((s) => s.score >= 0)
      scored.sort((a, b) => b.score - a.score)
      return scored.map((s) => s.item)
    })

    // Reset selection when the filtered list changes
    watch(filtered, () => {
      selectedIndex.value = 0
    })

    // Scroll selected item into view
    watch(selectedIndex, () => {
      const el = listRef.value?.children[selectedIndex.value] as HTMLElement | undefined
      el?.scrollIntoView({ block: 'nearest' })
    })

    // The selected-row tint follows the theme primary (so a rebranded app tints
    // its own picker), never a literal blue; the hex is only the CSS-var fallback.
    const selectedBg = computed(() =>
      mode.value === 'light'
        ? 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 12%, transparent)'
        : 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 25%, transparent)',
    )

    /**
     * The keyboard navigation: the arrows move the highlight within the
     * filtered rows (clamped), Enter selects it. The kit handles Escape. Bound to
     * the panel, so a key press anywhere in it (the autofocus input first of
     * all) lands here.
     *
     * @param e - The key press.
     */
    function handleKeyDown(e: KeyboardEvent): void {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          selectedIndex.value = Math.min(selectedIndex.value + 1, filtered.value.length - 1)
          break
        case 'ArrowUp':
          e.preventDefault()
          selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
          break
        case 'Enter': {
          e.preventDefault()
          const chosen = filtered.value[selectedIndex.value]
          if (chosen) props.onSelect(chosen)
          break
        }
      }
    }

    /** The backdrop's style (a full-viewport click-away tint). */
    return (): VNodeChild => {
      const narrow = isNarrow.value
      const rows = filtered.value
      return h(
        Modal,
        {
          open: true,
          onClose: props.onDismiss,
          initialFocus: inputTarget,
          showCloseButton: false,
          centered: !narrow,
          'aria-label': t('ide.quickPicker.label', undefined, { defaultValue: 'Quick picker' }),
          className: props.className,
          style: narrow ? { maxHeight: 'min(60dvh, 480px)' } : undefined,
        },
        {
          default: () => [
            h('input', {
              ref: inputRef,
              type: 'text',
              value: query.value,
              onInput: (e: Event) => {
                query.value = (e.target as HTMLInputElement).value
              },
              onKeydown: handleKeyDown,
              placeholder:
                props.placeholder ??
                t('ide.quickPicker.placeholder', undefined, {
                  defaultValue: 'Type to search…',
                }),
              style: {
                width: '100%',
                // 16px on phones/touch devices — below that iOS Safari zooms the
                // page when this (autofocused) input receives focus.
                fontSize: narrow || isCoarse.value ? '16px' : '13px',
                padding: '10px 12px',
                border: 'none',
                borderBottom: '1px solid var(--color-border, #333)',
                background: 'transparent',
                color: 'var(--mol-color-text, currentColor)',
                outline: 'none',
                boxSizing: 'border-box',
                flexShrink: '0',
              },
              onVnodeMounted: syncValueAttr,
              onVnodeUpdated: syncValueAttr,
            }),
            h(
              'div',
              {
                ref: listRef,
                style: {
                  // On narrow viewports the flex-column container's dvh cap governs
                  // instead of a fixed pixel height — the list shrinks to whatever
                  // fits above the on-screen keyboard.
                  maxHeight: narrow ? undefined : '300px',
                  minHeight: '0px',
                  overflow: 'auto',
                },
              },
              props.loading
                ? [
                    h(
                      'div',
                      {
                        style: {
                          padding: '12px',
                          fontSize: '12px',
                          color: 'var(--mol-color-text-secondary, #888)',
                          textAlign: 'center',
                        },
                      },
                      [t('ide.quickPicker.loading', undefined, { defaultValue: 'Loading…' })],
                    ),
                  ]
                : rows.length === 0
                  ? [
                      h(
                        'div',
                        {
                          style: {
                            padding: '12px',
                            fontSize: '12px',
                            color: 'var(--mol-color-text-secondary, #888)',
                            textAlign: 'center',
                          },
                        },
                        [
                          t('ide.quickPicker.noResults', undefined, {
                            defaultValue: 'No matching results',
                          }),
                        ],
                      ),
                    ]
                  : rows.map((item, i) =>
                      h(
                        'button',
                        {
                          key: item.id,
                          type: 'button',
                          'data-mol-id': `quick-picker-item-${item.id}`,
                          onClick: () => props.onSelect(item),
                          onKeydown: handleKeyDown,
                          onMouseenter: () => {
                            selectedIndex.value = i
                          },
                          class: cm.touchTargetCompact,
                          /* mol-bespoke-button: a picker ROW (icon + label + detail)
                           with keyboard-driven selection — a list item, not a CTA.
                           Selected tint is a theme token; the ≥36px coarse floor is
                           the ClassMap's (it was a hand-rolled `minHeight: 36`). */
                          style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                            padding: '6px 12px',
                            border: 'none',
                            background:
                              i === selectedIndex.value ? selectedBg.value : 'transparent',
                            color: 'var(--mol-color-text, currentColor)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            textAlign: 'left',
                          },
                        },
                        [
                          item.icon ?? null,
                          h(
                            'span',
                            {
                              style: {
                                flex: '1',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              },
                            },
                            [item.label],
                          ),
                          item.detail
                            ? h(
                                'span',
                                {
                                  style: {
                                    fontSize: '11px',
                                    color: 'var(--mol-color-text-secondary, #888)',
                                    flexShrink: '0',
                                  },
                                },
                                [item.detail],
                              )
                            : null,
                        ],
                      ),
                    ),
            ),
          ],
        },
      )
    }
  },
})
