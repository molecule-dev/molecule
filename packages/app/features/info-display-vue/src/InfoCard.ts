/**
 * Vue Card wrapping a DefinitionList — the counterpart of
 * `@molecule/app-info-display-react`'s `InfoCard`: the same props (React names),
 * the same ClassMap tokens, and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, toRaw, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-vue'

import { DefinitionList } from './DefinitionList.js'
import type { DefinitionField } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (slot: (() => VNodeChild[]) | undefined, prop: VNodeChild): VNodeChild[] => {
  if (slot) return slot()
  if (prop == null || prop === false) return []
  // A node passed through reactive state reads as a proxy; Vue writes `el`
  // onto every VNode it mounts, which would re-trigger the reading render.
  const value = toRaw(prop)
  return Array.isArray(value) ? value : [value]
}

/**
 * Card wrapping a `<DefinitionList>` of metadata fields.
 *
 * Used all over CRM/helpdesk/finance detail pages (CompanyInfoCard,
 * DealInfoCard, TicketDetailsCard, TransactionDetailsCard) — same shape
 * everywhere, only the fields differ.
 *
 * @param props - Component props (see {@link InfoCardProps}).
 * @returns The info card component.
 */
export const InfoCard = defineComponent({
  name: 'InfoCard',
  props: {
    title: null,
    icon: null,
    actions: null,
    fields: {
      type: Array as PropType<DefinitionField[]>,
      required: true,
    },
    columns: {
      type: Number as PropType<1 | 2 | 3>,
      default: 1,
    },
    className: String,
    dataMolId: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        Card,
        { className: props.className, 'data-mol-id': props.dataMolId },
        {
          default: () =>
            h('div', { class: cm.stack(3) }, [
              h('header', { class: cm.flex({ justify: 'between', align: 'center', gap: 'sm' }) }, [
                h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
                  ...slotOrProp(slots.icon, props.icon),
                  h(
                    'h3',
                    { class: cm.cn(cm.textSize('base'), cm.fontWeight('semibold')) },
                    slotOrProp(slots.title, props.title),
                  ),
                ]),
                ...slotOrProp(slots.actions, props.actions),
              ]),
              h(DefinitionList, { fields: props.fields, columns: props.columns }),
            ]),
        },
      )
  },
})
