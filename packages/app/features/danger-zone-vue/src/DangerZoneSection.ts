/**
 * Vue destructive-action section card.
 *
 * Vue counterpart of `@molecule/app-danger-zone-react`'s `DangerZoneSection`
 * — the same props (React names), the same DOM for the same input: a Card
 * with the title, the description, optional extra content and the action
 * button on the right (error/danger accent).
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-vue'

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
 * Card-wrapped section for destructive actions — delete account, reset data,
 * revoke access. Uses the error/danger accent color and puts the action on
 * the right. While `loading` is true the button disables and shows a loading
 * glyph.
 *
 * @param props - Component props (`DangerZoneSectionProps`).
 * @returns The section component.
 */
export const DangerZoneSection = defineComponent({
  name: 'DangerZoneSection',
  props: {
    /** Section title. */
    title: null,
    /** Explanation of the destructive action. */
    description: null,
    /** Label on the action button (e.g. "Delete account"). */
    actionLabel: null,
    /** When true, the button disables and shows a loading label. */
    loading: {
      type: Boolean as PropType<boolean | undefined>,
      default: false,
    },
    /** When true, the button is disabled without loading. */
    disabled: {
      type: Boolean as PropType<boolean | undefined>,
      default: false,
    },
    /** Extra classes on the Card. */
    className: String,
    /** `data-mol-id` for AI-agent selectors. */
    dataMolId: String,
  },
  emits: ['action'],
  setup(props, { slots, emit }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        Card,
        { className: props.className, 'data-mol-id': props.dataMolId },
        {
          default: () => [
            h('div', { class: cm.stack(3) }, [
              h('header', { class: cm.stack(1 as const) }, [
                h(
                  'h3',
                  { class: cm.cn(cm.textSize('base'), cm.fontWeight('semibold')) },
                  slotOrProp(slots.title, props.title),
                ),
                h(
                  'p',
                  { class: cm.textSize('sm') },
                  slotOrProp(slots.description, props.description),
                ),
              ]),
              ...(slots.default?.() ?? []),
              h('div', { class: cm.flex({ justify: 'end' }) }, [
                h(
                  Button,
                  {
                    variant: 'solid',
                    color: 'error',
                    disabled: props.disabled || props.loading,
                    onClick: (event: MouseEvent) => emit('action', event),
                  },
                  {
                    default: () =>
                      props.loading ? '…' : slotOrProp(slots.actionLabel, props.actionLabel),
                  },
                ),
              ]),
            ]),
          ],
        },
      )
  },
})
