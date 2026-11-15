/**
 * Vue features × plans pricing comparison table.
 *
 * Vue counterpart of `@molecule/app-pricing-table-react`'s `PricingTable` —
 * the same props (React names) and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-vue'

import type { PricingFeature, PricingPlan } from './types.js'

/** React's inline styles, spelled as React serializes them (numbers gain `px`). */
const wrapperStyle = 'overflow-x: auto'
const tableStyle = 'width: 100%; border-collapse: separate; border-spacing: 0px'
const labelHeadStyle = 'min-width: 160px; text-align: left'
const planHeadStyle = 'vertical-align: top; padding: 12px'
const groupHeadStyle = 'text-align: left; padding: 12px 8px'
const valueCellStyle = 'padding: 8px; text-align: center'
const labelCellStyle = 'padding: 8px; text-align: left'
const recommendedStyle = 'outline: 2px solid currentColor; outline-offset: -2px'

/**
 * Renders a feature cell value: `true` → ✓, `false` → —, anything else pass-through.
 *
 * @param v - The per-plan feature value.
 * @returns The content to render.
 */
function renderValue(v: boolean | string | VNodeChild): VNodeChild {
  if (v === true) return '✓'
  if (v === false) return '—'
  return v as VNodeChild
}

/**
 * Side-by-side pricing comparison — features × plans matrix. A header row
 * holds plan cards (name, price, CTA); body rows show per-feature availability
 * (`true` → ✓, `false` → —, strings/nodes pass through). The wrapper scrolls
 * horizontally when columns overflow.
 *
 * @param props - Component props (see {@link PricingTableProps}).
 * @returns The rendered pricing table component.
 */
export const PricingTable = defineComponent({
  name: 'PricingTable',
  props: {
    plans: { type: Array as PropType<PricingPlan[]>, required: true },
    features: { type: Array as PropType<PricingFeature[]>, required: true },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNode => {
      const cols = props.plans.length

      /**
       * One plan column's header cell.
       * @param plan - The plan.
       * @returns The `<th>` cell.
       */
      const planHead = (plan: PricingPlan): VNode => {
        const cta = plan.cta
        return h('th', { key: plan.id, style: planHeadStyle }, [
          h(Card, { style: plan.recommended ? recommendedStyle : undefined }, (): VNodeChild[] => [
            h('div', { class: cm.stack(2) }, [
              h('h3', { class: cm.cn(cm.textSize('lg'), cm.fontWeight('bold')) }, [plan.name]),
              plan.description ? h('p', { class: cm.textSize('sm') }, [plan.description]) : null,
              h('div', { class: cm.flex({ align: 'baseline', gap: 'xs' }) }, [
                h('span', { class: cm.cn(cm.textSize('2xl'), cm.fontWeight('bold')) }, [
                  plan.price,
                ]),
                plan.interval ? h('span', { class: cm.textSize('xs') }, [plan.interval]) : null,
              ]),
              cta
                ? cta.href
                  ? h('a', { href: cta.href }, [
                      h(
                        Button,
                        { variant: 'solid', color: plan.recommended ? 'primary' : 'secondary' },
                        (): VNodeChild[] => [cta.label],
                      ),
                    ])
                  : h(
                      Button,
                      {
                        variant: 'solid',
                        color: plan.recommended ? 'primary' : 'secondary',
                        onClick: cta.onClick,
                      },
                      (): VNodeChild[] => [cta.label],
                    )
                : null,
            ]),
          ]),
        ])
      }

      /**
       * One feature's row(s): its group heading (when it has one) and its value row.
       * @param feature - The feature.
       * @param index - Its position in `features` (React's fragment key).
       * @returns The table row(s).
       */
      const featureRows = (feature: PricingFeature, index: number): VNode[] => {
        const rows: VNode[] = []
        if (feature.groupHeading)
          rows.push(
            h('tr', { key: `g-${index}` }, [
              h('th', { colSpan: cols + 1, style: groupHeadStyle }, [
                h('span', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) }, [
                  feature.groupHeading,
                ]),
              ]),
            ]),
          )
        rows.push(
          h('tr', { key: `r-${index}` }, [
            h('td', { style: labelCellStyle }, [
              h('span', { class: cm.textSize('sm') }, [feature.label]),
            ]),
            ...props.plans.map((plan) =>
              h('td', { key: plan.id, style: valueCellStyle }, [
                h('span', { class: cm.textSize('sm') }, [renderValue(feature.values[plan.id])]),
              ]),
            ),
          ]),
        )
        return rows
      }

      return h('div', { class: cm.cn(cm.stack(0), props.className), style: wrapperStyle }, [
        h('table', { style: tableStyle }, [
          h('thead', [
            h('tr', [
              h('th', { style: labelHeadStyle }, ' '),
              ...props.plans.map((plan) => planHead(plan)),
            ]),
          ]),
          h(
            'tbody',
            props.features.flatMap((feature, index) => featureRows(feature, index)),
          ),
        ]),
      ])
    }
  },
})
