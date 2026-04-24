import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
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

interface OrderTimelineProps {
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
 * @param root0
 * @param root0.milestones
 * @param root0.eta
 * @param root0.orientation
 * @param root0.className
 */
export function OrderTimeline({
  milestones,
  eta,
  orientation = 'horizontal',
  className,
}: OrderTimelineProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.stack(3), className)}>
      <div
        className={cm.cn(
          orientation === 'vertical' ? cm.stack(2) : cm.flex({ align: 'start', gap: 'sm' }),
        )}
      >
        {milestones.map((m, i) => {
          const isLast = i === milestones.length - 1
          const color = m.current ? '#60a5fa' : m.completed ? '#22c55e' : '#d1d5db'
          return (
            <div
              key={m.id}
              className={cm.cn(
                orientation === 'vertical'
                  ? cm.flex({ align: 'start', gap: 'sm' })
                  : cm.cn(cm.stack(1 as const), cm.flex1, cm.textCenter),
              )}
            >
              <div className={cm.flex({ align: 'center', justify: 'center' })}>
                <span
                  aria-hidden
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: color,
                    border: m.current ? '3px solid currentColor' : undefined,
                  }}
                />
                {!isLast && (
                  <span
                    aria-hidden
                    style={{
                      [orientation === 'vertical' ? 'height' : 'width']:
                        orientation === 'vertical' ? 24 : '100%',
                      [orientation === 'vertical' ? 'width' : 'height']: 2,
                      background: m.completed ? '#22c55e' : '#d1d5db',
                      display: 'inline-block',
                      ...(orientation === 'vertical'
                        ? {}
                        : { flex: 1, marginLeft: 4, marginRight: 4 }),
                    }}
                  />
                )}
              </div>
              <div className={cm.cn(cm.stack(0 as const))}>
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    m.current ? cm.fontWeight('bold') : cm.fontWeight('medium'),
                  )}
                >
                  {m.label}
                </span>
                {m.detail && <span className={cm.textSize('xs')}>{m.detail}</span>}
              </div>
            </div>
          )
        })}
      </div>
      {eta && <div className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{eta}</div>}
    </div>
  )
}
