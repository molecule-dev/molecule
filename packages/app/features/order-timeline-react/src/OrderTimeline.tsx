import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'

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
    <div className={cm.cn(cm.stack(3), className)}>
      <div
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
                  className={dotClass}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: m.current ? '3px solid currentColor' : undefined,
                  }}
                />
                {!isLast && (
                  <span
                    aria-hidden
                    className={connectorClass}
                    style={{
                      [orientation === 'vertical' ? 'height' : 'width']:
                        orientation === 'vertical' ? 24 : '100%',
                      [orientation === 'vertical' ? 'width' : 'height']: 2,
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
