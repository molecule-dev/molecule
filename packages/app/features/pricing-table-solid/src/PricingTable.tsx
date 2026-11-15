/**
 * Solid features × plans pricing comparison table.
 *
 * Solid counterpart of `@molecule/app-pricing-table-react`'s `PricingTable` —
 * the same props (React names) and the same DOM for the same input.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-solid'

import type { PricingFeature, PricingPlan, PricingTableProps } from './types.js'

/** React's inline styles, spelled as React serializes them (numbers gain `px`). */
const wrapperStyle = 'overflow-x: auto'
const tableStyle = 'width: 100%; border-collapse: separate; border-spacing: 0px'
const labelHeadStyle = 'min-width: 160px; text-align: left'
const planHeadStyle = 'vertical-align: top; padding: 12px'
const groupHeadStyle = 'text-align: left; padding: 12px 8px'
const valueCellStyle = 'padding: 8px; text-align: center'
const labelCellStyle = 'padding: 8px; text-align: left'
const recommendedStyle = { outline: '2px solid currentColor', outlineOffset: '-2px' }

/**
 * Renders a feature cell value: `true` → ✓, `false` → —, anything else pass-through.
 *
 * @param v - The per-plan feature value.
 * @returns The content to render.
 */
function renderValue(v: boolean | string | JSX.Element): JSX.Element {
  if (v === true) return '✓'
  if (v === false) return '—'
  return v
}

/**
 * One plan column's header cell: the plan card with its name, description,
 * price, interval and call to action.
 *
 * @param plan - The plan.
 * @param cm - The current class map.
 * @returns The `<th>` cell.
 */
function planHead(plan: PricingPlan, cm: ReturnType<typeof getClassMap>): JSX.Element {
  const cta = plan.cta
  return (
    <th style={planHeadStyle}>
      <Card style={plan.recommended ? recommendedStyle : undefined}>
        <div class={cm.stack(2)}>
          <h3 class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{plan.name}</h3>
          {plan.description ? <p class={cm.textSize('sm')}>{plan.description}</p> : null}
          <div class={cm.flex({ align: 'baseline', gap: 'xs' })}>
            <span class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>{plan.price}</span>
            {plan.interval ? <span class={cm.textSize('xs')}>{plan.interval}</span> : null}
          </div>
          {cta ? (
            cta.href ? (
              <a href={cta.href}>
                <Button variant="solid" color={plan.recommended ? 'primary' : 'secondary'}>
                  {cta.label}
                </Button>
              </a>
            ) : (
              <Button
                variant="solid"
                color={plan.recommended ? 'primary' : 'secondary'}
                onClick={cta.onClick}
              >
                {cta.label}
              </Button>
            )
          ) : null}
        </div>
      </Card>
    </th>
  )
}

/**
 * One feature's rows: its group heading (when it has one) and its value row.
 *
 * @param feature - The feature.
 * @param plans - The plan columns its values are read by, in order.
 * @param cm - The current class map.
 * @returns The table row(s).
 */
function featureRows(
  feature: PricingFeature,
  plans: PricingPlan[],
  cm: ReturnType<typeof getClassMap>,
): JSX.Element[] {
  const rows: JSX.Element[] = []
  if (feature.groupHeading)
    rows.push(
      <tr>
        <th colSpan={plans.length + 1} style={groupHeadStyle}>
          <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
            {feature.groupHeading}
          </span>
        </th>
      </tr>,
    )
  rows.push(
    <tr>
      <td style={labelCellStyle}>
        <span class={cm.textSize('sm')}>{feature.label}</span>
      </td>
      {plans.map((plan) => (
        <td style={valueCellStyle}>
          <span class={cm.textSize('sm')}>{renderValue(feature.values[plan.id])}</span>
        </td>
      ))}
    </tr>,
  )
  return rows
}

/**
 * Side-by-side pricing comparison — features × plans matrix. A header row
 * holds plan cards (name, price, CTA); body rows show per-feature availability
 * (`true` → ✓, `false` → —, strings/nodes pass through). The wrapper scrolls
 * horizontally when columns overflow.
 *
 * @param props - Component props (see {@link PricingTableProps}).
 * @returns The rendered pricing table.
 */
export const PricingTable: Component<PricingTableProps> = (props) => {
  const cm = getClassMap()
  return (
    <div class={cm.cn(cm.stack(0), props.className)} style={wrapperStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={labelHeadStyle}> </th>
            {props.plans.map((plan) => planHead(plan, cm))}
          </tr>
        </thead>
        <tbody>{props.features.map((feature) => featureRows(feature, props.plans, cm))}</tbody>
      </table>
    </div>
  )
}
