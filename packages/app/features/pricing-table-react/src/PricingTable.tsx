import { Fragment, type ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-react'
import { Anchor, Box, TableBox, TableCell, Text } from '@molecule/app-ui-react/elements'

/** Describes a single plan column in the pricing table. */
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

/** Describes a single feature row and its per-plan values in the pricing table. */
export interface PricingFeature {
  /** Row label. */
  label: ReactNode
  /** Per-plan-id values: `true` / `false` / a string / a node. */
  values: Record<string, boolean | string | ReactNode>
  /** Optional category / group heading rendered above this row. */
  groupHeading?: ReactNode
}

/** Props for {@link PricingTable}. */
export interface PricingTableProps {
  plans: PricingPlan[]
  features: PricingFeature[]
  /** Extra classes. */
  className?: string
}

/**
 * Renders a feature cell value: `true` → ✓, `false` → —, anything else pass-through.
 * @param v
 */
function renderValue(v: boolean | string | ReactNode): ReactNode {
  if (v === true) return '✓'
  if (v === false) return '—'
  return v
}

/**
 * Side-by-side pricing comparison — features × plans matrix. A header
 * row holds plan cards (name, price, CTA); body rows show per-feature
 * availability (`true` → ✓, `false` → —, strings/nodes pass through).
 * The wrapper scrolls horizontally when columns overflow.
 * @param props - Component props (see {@link PricingTableProps}).
 */
export function PricingTable({ plans, features, className }: PricingTableProps): ReactNode {
  const cm = getClassMap()
  const cols = plans.length
  return (
    <Box
      as="div"
      className={cm.cn(cm.stack(0 as const), className)}
      webStyle={{ overflowX: 'auto' }}
    >
      <TableBox
        as="table"
        webStyle={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}
      >
        <TableBox as="thead">
          <TableBox as="tr">
            <TableCell as="th" webStyle={{ minWidth: 160, textAlign: 'left' }}>
              {' '}
            </TableCell>
            {plans.map((p) => (
              <TableCell key={p.id} as="th" webStyle={{ verticalAlign: 'top', padding: 12 }}>
                <Card
                  style={
                    p.recommended
                      ? { outline: '2px solid currentColor', outlineOffset: -2 }
                      : undefined
                  }
                >
                  <Box as="div" className={cm.stack(2)}>
                    <Text as="h3" className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                      {p.name}
                    </Text>
                    {p.description && (
                      <Text as="p" className={cm.textSize('sm')}>
                        {p.description}
                      </Text>
                    )}
                    <Box as="div" className={cm.flex({ align: 'baseline', gap: 'xs' })}>
                      <Text as="span" className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
                        {p.price}
                      </Text>
                      {p.interval && (
                        <Text as="span" className={cm.textSize('xs')}>
                          {p.interval}
                        </Text>
                      )}
                    </Box>
                    {p.cta &&
                      (p.cta.href ? (
                        <Anchor href={p.cta.href}>
                          <Button variant="solid" color={p.recommended ? 'primary' : 'secondary'}>
                            {p.cta.label}
                          </Button>
                        </Anchor>
                      ) : (
                        <Button
                          variant="solid"
                          color={p.recommended ? 'primary' : 'secondary'}
                          onClick={p.cta.onClick}
                        >
                          {p.cta.label}
                        </Button>
                      ))}
                  </Box>
                </Card>
              </TableCell>
            ))}
          </TableBox>
        </TableBox>
        <TableBox as="tbody">
          {features.map((f, i) => (
            <Fragment key={i}>
              {f.groupHeading && (
                <TableBox as="tr" key={`g-${i}`}>
                  <TableCell
                    as="th"
                    colSpan={cols + 1}
                    webStyle={{ textAlign: 'left', padding: '12px 8px' }}
                  >
                    <Text as="span" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                      {f.groupHeading}
                    </Text>
                  </TableCell>
                </TableBox>
              )}
              <TableBox as="tr" key={`r-${i}`}>
                <TableCell as="td" webStyle={{ padding: '8px', textAlign: 'left' }}>
                  <Text as="span" className={cm.textSize('sm')}>
                    {f.label}
                  </Text>
                </TableCell>
                {plans.map((p) => (
                  <TableCell key={p.id} as="td" webStyle={{ padding: '8px', textAlign: 'center' }}>
                    <Text as="span" className={cm.textSize('sm')}>
                      {renderValue(f.values[p.id])}
                    </Text>
                  </TableCell>
                ))}
              </TableBox>
            </Fragment>
          ))}
        </TableBox>
      </TableBox>
    </Box>
  )
}
