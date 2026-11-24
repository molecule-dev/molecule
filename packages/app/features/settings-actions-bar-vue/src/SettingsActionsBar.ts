/**
 * Vue sticky bottom / inline Save-Cancel bar for settings and forms.
 *
 * Vue counterpart of `@molecule/app-settings-actions-bar-react`'s
 * `SettingsActionsBar` — the same props (React names), the same DOM for the
 * same input, and the same callbacks (Save with no arguments, Cancel with the
 * click event).
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import type { SettingsActionsBarProps } from './types.js'

/**
 * React's sticky inline style (`{ position: 'sticky', bottom: 0, zIndex: 5 }`),
 * written as the same values react-dom writes to the CSSOM.
 */
const STICKY_STYLE = { position: 'sticky', bottom: '0', zIndex: '5' } as const

/**
 * Formats an epoch-ms timestamp as a short human-readable relative string
 * (e.g. "3m ago") — React's `formatRelativeShort`, verbatim.
 *
 * @param epochMs - The timestamp, in epoch milliseconds.
 * @returns The shorthand relative time.
 */
function formatRelativeShort(epochMs: number): string {
  const s = Math.floor((Date.now() - epochMs) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Sticky bottom / inline Save-Cancel bar for settings and forms.
 *
 * Features:
 * - Primary Save button with loading/disabled state.
 * - Optional Cancel button (hidden when `onCancel` is omitted).
 * - "Saved Xm ago" status when `savedAt` is provided.
 * - Inline error text.
 * - Optional leading slot for custom status badges.
 *
 * @param props - Component props (see {@link SettingsActionsBarProps}).
 * @returns The settings actions bar component.
 */
export const SettingsActionsBar = defineComponent({
  name: 'SettingsActionsBar',
  props: {
    /** Called when Save is clicked. */
    onSave: {
      type: Function as PropType<SettingsActionsBarProps['onSave']>,
      required: true,
    },
    /** Called when Cancel is clicked. Hides Cancel if omitted. */
    onCancel: {
      type: Function as PropType<SettingsActionsBarProps['onCancel']>,
      default: undefined,
    },
    /** When true, the Save button disables and shows a loading label. */
    loading: {
      type: Boolean as PropType<SettingsActionsBarProps['loading']>,
      default: false,
    },
    /** When true, the Save button is disabled without a loading label. */
    disabled: {
      type: Boolean as PropType<SettingsActionsBarProps['disabled']>,
      default: false,
    },
    /** When set, shows a "Saved" badge with the relative time. Epoch ms. */
    savedAt: {
      type: Number as PropType<SettingsActionsBarProps['savedAt']>,
      default: undefined,
    },
    /** Inline error text (or the `error` slot). */
    error: null,
    /** Sticky-to-bottom. Defaults to true. */
    sticky: {
      type: Boolean as PropType<SettingsActionsBarProps['sticky']>,
      default: true,
    },
    /** Content before the buttons (or the `leading` slot). */
    leading: null,
    /** Extra classes. */
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const errorNodes = slotOrProp(slots.error, props.error)
      return h(
        'div',
        {
          // A real theme surface + top border so the (sticky) bar is opaque and
          // page content no longer shows through it while scrolling. Both are
          // theme tokens, never hardcoded colors, so light/dark stay correct.
          class: cm.cn(
            cm.surface,
            cm.borderT,
            cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            props.className,
          ),
          style: props.sticky ? STICKY_STYLE : undefined,
        },
        [
          h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
            ...slotOrProp(slots.leading, props.leading),
            ...(props.savedAt !== null && props.savedAt !== undefined
              ? [
                  h('span', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) }, [
                    t(
                      'settingsActions.saved',
                      { at: formatRelativeShort(props.savedAt) },
                      { defaultValue: 'Saved {{at}}' },
                    ),
                  ]),
                ]
              : []),
            ...(toChildArray(errorNodes).length > 0
              ? [h('span', { class: cm.textSize('sm') }, errorNodes)]
              : []),
          ]),
          h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
            ...(props.onCancel
              ? [
                  h(
                    Button,
                    {
                      variant: 'ghost',
                      onClick: (event: MouseEvent) => props.onCancel?.(event),
                      disabled: props.loading,
                    },
                    {
                      default: () => [t('settingsActions.cancel', {}, { defaultValue: 'Cancel' })],
                    },
                  ),
                ]
              : []),
            h(
              Button,
              {
                variant: 'solid',
                color: 'primary',
                onClick: () => void props.onSave(),
                disabled: props.loading || props.disabled,
              },
              {
                default: () => [
                  props.loading
                    ? t('settingsActions.saving', {}, { defaultValue: 'Saving…' })
                    : t('settingsActions.save', {}, { defaultValue: 'Save changes' }),
                ],
              },
            ),
          ]),
        ],
      )
    }
  },
})
