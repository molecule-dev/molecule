import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

/** A single step in an order or shipment progress timeline. */
export interface OrderMilestone {
  id: string
  /** Display label ("Placed", "Shipped", "Delivered"). */
  label: ReactNode
  /** Optional description / timestamp / location. */
  detail?: ReactNode
  /** Is this milestone completed? */
  completed?: boolean
  /** Is this the current (in-progress) milestone? */
  current?: boolean
}

/** Props for {@link OrderTimeline}. */
export interface OrderTimelineProps {
  milestones: OrderMilestone[]
  /** Optional ETA / summary line. */
  eta?: ReactNode
  /** Layout orientation. */
  orientation?: 'horizontal' | 'vertical'
  /** Extra classes. */
  className?: string
}

/**
 * Order / shipment progress timeline — typical e-commerce flow:
 * "Placed → Confirmed → Shipped → Out for delivery → Delivered".
 *
 * Different from `<Stepper>` in two ways:
 * - Focuses on milestones (with optional per-step detail) rather than
 *   multi-page wizard steps.
 * - Horizontal layout is responsive with connector lines between nodes.
 * @param props - Component props (see {@link OrderTimelineProps}).
 */
export function OrderTimeline({
  milestones,
  eta: etaProp,
  orientation = 'horizontal',
  className,
}: OrderTimelineProps): JSX.Element {
  const eta = slot(etaProp)
  const cm = getClassMap()
  return (
    <Box as="div" className={cm.cn(cm.stack(3), className)}>
      <Box
        as="div"
        className={cm.cn(
          orientation === 'vertical' ? cm.stack(2) : cm.flex({ align: 'start', gap: 'sm' }),
        )}
      >
        {milestones.map((m, i) => {
          const isLast = i === milestones.length - 1
          // Status nodes take their semantic tone (current = info, completed =
          // success); an un-reached milestone is de-emphasis chrome, filled with
          // the theme's border colour rather than a status tone.
          const dotClass = cm.cn(
            m.current ? cm.bgTone('info') : m.completed ? cm.bgTone('success') : cm.bgBorder,
          )
          const connectorClass = cm.cn(m.completed ? cm.bgTone('success') : cm.bgBorder)
          return (
            <Box
              as="div"
              key={m.id}
              className={cm.cn(
                orientation === 'vertical'
                  ? cm.flex({ align: 'start', gap: 'sm' })
                  : cm.cn(cm.stack(1 as const), cm.flex1, cm.textCenter),
              )}
            >
              <Box as="div" className={cm.flex({ align: 'center', justify: 'center' })}>
                <Box
                  as="span"
                  aria-hidden
                  className={dotClass}
                  style={{ width: 14, height: 14 }}
                  webStyle={{
                    borderRadius: '50%',
                    border: m.current ? '3px solid currentColor' : undefined,
                  }}
                />
                {!isLast && (
                  <Box
                    as="span"
                    aria-hidden
                    className={connectorClass}
                    style={
                      orientation === 'vertical'
                        ? { height: 24, width: 2 }
                        : { height: 2, width: '100%', flex: 1, marginLeft: 4, marginRight: 4 }
                    }
                    webStyle={{ display: 'inline-block' }}
                  />
                )}
              </Box>
              <Box as="div" className={cm.cn(cm.stack(0 as const))}>
                <Text
                  as="span"
                  className={cm.cn(
                    cm.textSize('sm'),
                    m.current ? cm.fontWeight('bold') : cm.fontWeight('medium'),
                  )}
                >
                  {m.label}
                </Text>
                {m.detail && (
                  <Text as="span" className={cm.textSize('xs')}>
                    {m.detail}
                  </Text>
                )}
              </Box>
            </Box>
          )
        })}
      </Box>
      {eta && (
        <Box as="div" className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {eta}
        </Box>
      )}
    </Box>
  )
}
