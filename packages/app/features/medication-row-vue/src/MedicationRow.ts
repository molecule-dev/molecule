/**
 * Vue medication record row — drug name + dosage/form, instructions,
 * prescriber, days-of-supply and refills-remaining readouts, optional
 * pill-color dot and right-side actions.
 *
 * Vue counterpart of `@molecule/app-medication-row-react`'s `MedicationRow` —
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @module
 */

import { defineComponent, h, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot,
 * applying React's truthiness: the slot wins when present, and a falsy prop
 * renders nothing (React's `{expr && <…>}` branch).
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrTruthy = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop ? [prop] : []
}

/**
 * Medication record row — drug name, dosage/form, instructions, prescriber,
 * supply countdown, refills remaining. Used in medication-reminder,
 * patient-facing health portals, pharmacy dashboards.
 *
 * The "Prescribed by" / "N day supply" / "N refills" labels route through
 * `t()` with the same keys and default values React uses.
 *
 * @param props - Component props (the `MedicationRowProps` shape in `types.ts`).
 * @returns The medication row component.
 */
export const MedicationRow = defineComponent({
  name: 'MedicationRow',
  props: {
    // Node-valued props: declared with `null` (any runtime type, no
    // validation — a VNode, a string, or `null` to omit).
    name: null,
    dosage: null,
    form: null,
    color: { type: String, default: undefined },
    instructions: null,
    prescriber: null,
    supplyDays: { type: Number, default: undefined },
    refills: { type: Number, default: undefined },
    actions: null,
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const name = slotOrTruthy(slots.name, props.name)
      const dosage = slotOrTruthy(slots.dosage, props.dosage)
      const form = slotOrTruthy(slots.form, props.form)
      const instructions = slotOrTruthy(slots.instructions, props.instructions)
      const prescriber = slotOrTruthy(slots.prescriber, props.prescriber)
      const actions = slotOrTruthy(slots.actions, props.actions)

      return h(
        Card,
        { className: props.className },
        {
          default: () => [
            h('div', { class: cm.flex({ align: 'start', gap: 'md' }) }, [
              props.color
                ? h('span', {
                    'aria-hidden': 'true',
                    class: cm.cn(cm.shrink0, cm.roundedFull),
                    style: {
                      width: '24px',
                      height: '24px',
                      background: props.color,
                    },
                  })
                : null,
              h('div', { class: cm.cn(cm.flex1, cm.stack(1)) }, [
                h('header', { class: cm.flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' }) }, [
                  h('h3', { class: cm.cn(cm.textSize('base'), cm.fontWeight('bold')) }, name),
                  dosage.length > 0
                    ? h(
                        'span',
                        { class: cm.cn(cm.textSize('sm'), cm.fontWeight('medium')) },
                        dosage,
                      )
                    : null,
                  form.length > 0 ? h('span', { class: cm.textSize('xs') }, form) : null,
                ]),
                instructions.length > 0 ? h('p', { class: cm.textSize('sm') }, instructions) : null,
                h('div', { class: cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }) }, [
                  prescriber.length > 0
                    ? h('span', { class: cm.textSize('xs') }, [
                        t('medication.prescribedBy', {}, { defaultValue: 'Prescribed by' }),
                        ' ',
                        ...prescriber,
                      ])
                    : null,
                  props.supplyDays !== undefined
                    ? h('span', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) }, [
                        '· ',
                        t(
                          'medication.supplyDays',
                          { days: props.supplyDays },
                          { defaultValue: '{{days}} day supply' },
                        ),
                      ])
                    : null,
                  props.refills !== undefined
                    ? h('span', { class: cm.textSize('xs') }, [
                        '· ',
                        t(
                          'medication.refills',
                          { refills: props.refills },
                          { defaultValue: '{{refills}} refills' },
                        ),
                      ])
                    : null,
                ]),
              ]),
              actions.length > 0 ? h('div', { class: cm.shrink0 }, actions) : null,
            ]),
          ],
        },
      )
    }
  },
})
