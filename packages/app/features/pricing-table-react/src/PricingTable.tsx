import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-react'

/**
 *
 */
export interface PricingPlan {
  id: string
  name: ReactNode
  description?: ReactNode
  price: ReactNode
  interval?: ReactNode
  /** CTA renders as primary button on this column. */
  cta?: { label: ReactNode; onClick?: () => void; href?: string }
  /** Visually emphasise as recommended / featured. */
  recommended?: boolean
}

/**
 *
 */
export interface PricingFeature {
  /** Row label. */
  label: ReactNode
  /** Per-plan-id values: `true` / `false` / a string / a node. */
  values: Record<string, boolean | string | ReactNode>
  /** Optional category / group heading rendered above this row. */
  groupHeading?: ReactNode
}

interface PricingTableProps {
  plans: PricingPlan[]
  features: PricingFeature[]
  /** Extra classes. */
  className?: string
}

/**
 *
 * @param v
 */
function renderValue(v: boolean | string | ReactNode): ReactNode {
  if (v === true) return '✓'
  if (v === false) return '—'
  return v
}

/**
 * Side-by-side pricing comparison — features × plans matrix. Sticky
 * header row holds plan names, prices, and CTAs; following rows show
 * per-feature availability.
 * @param root0
 * @param root0.plans
 * @param root0.features
 * @param root0.className
 */
export function PricingTable({ plans, features, className }: PricingTableProps) {
  const cm = getClassMap()
  const cols = plans.length
  return (
    <div className={cm.cn(cm.stack(0 as const), className)} style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr>
            <th style={{ minWidth: 160, textAlign: 'left' }}> </th>
            {plans.map((p) => (
              <th key={p.id} style={{ verticalAlign: 'top', padding: 12 }}>
                <Card
                  style={
                    p.recommended
                      ? { outline: '2px solid currentColor', outlineOffset: -2 }
                      : undefined
                  }
                >
                  <div className={cm.stack(2)}>
                    <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{p.name}</h3>
                    {p.description && <p className={cm.textSize('sm')}>{p.description}</p>}
                    <div className={cm.flex({ align: 'baseline', gap: 'xs' })}>
                      <span className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
                        {p.price}
                      </span>
                      {p.interval && <span className={cm.textSize('xs')}>{p.interval}</span>}
                    </div>
                    {p.cta &&
                      (p.cta.href ? (
                        <a href={p.cta.href}>
                          <Button variant="solid" color={p.recommended ? 'primary' : 'secondary'}>
                            {p.cta.label}
                          </Button>
                        </a>
                      ) : (
                        <Button
                          variant="solid"
                          color={p.recommended ? 'primary' : 'secondary'}
                          onClick={p.cta.onClick}
                        >
                          {p.cta.label}
                        </Button>
                      ))}
                  </div>
                </Card>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((f, i) => (
            <>
              {f.groupHeading && (
                <tr key={`g-${i}`}>
                  <th colSpan={cols + 1} style={{ textAlign: 'left', padding: '12px 8px' }}>
                    <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                      {f.groupHeading}
                    </span>
                  </th>
                </tr>
              )}
              <tr key={`r-${i}`}>
                <td style={{ padding: '8px', textAlign: 'left' }}>
                  <span className={cm.textSize('sm')}>{f.label}</span>
                </td>
                {plans.map((p) => (
                  <td key={p.id} style={{ padding: '8px', textAlign: 'center' }}>
                    <span className={cm.textSize('sm')}>{renderValue(f.values[p.id])}</span>
                  </td>
                ))}
              </tr>
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
