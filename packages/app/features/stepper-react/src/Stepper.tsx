import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
export type StepStatus = 'completed' | 'current' | 'pending' | 'error'

/**
 *
 */
export interface StepperStep {
  /** Step id. */
  id: string
  /** Step label. */
  label: ReactNode
  /** Optional description. */
  description?: ReactNode
  /** Explicit status — when omitted, derived from `currentStep`. */
  status?: StepStatus
}

interface StepperProps {
  /** Steps to render. */
  steps: StepperStep[]
  /** Index of the current step (0-based). */
  currentStep: number
  /** Visual variant. */
  variant?: 'dots' | 'bar' | 'cards'
  /** Layout orientation. */
  orientation?: 'horizontal' | 'vertical'
  /** Called when a completed step is clicked (optional navigation). */
  onStepClick?: (stepId: string, index: number) => void
  /** Extra classes. */
  className?: string
}

/**
 * Multi-step progress indicator — useful for checkout flows, onboarding
 * wizards, course module progress, etc.
 *
 * Variants:
 * - `'dots'` — small numbered circles connected by a line.
 * - `'bar'` — horizontal filled bar with step labels above.
 * - `'cards'` — each step is a card with title + description.
 * @param root0
 * @param root0.steps
 * @param root0.currentStep
 * @param root0.variant
 * @param root0.orientation
 * @param root0.onStepClick
 * @param root0.className
 */
export function Stepper({
  steps,
  currentStep,
  variant = 'dots',
  orientation = 'horizontal',
  onStepClick,
  className,
}: StepperProps) {
  const cm = getClassMap()
  /**
   *
   * @param i
   * @param explicit
   */
  function statusOf(i: number, explicit?: StepStatus): StepStatus {
    if (explicit) return explicit
    if (i < currentStep) return 'completed'
    if (i === currentStep) return 'current'
    return 'pending'
  }

  if (variant === 'bar') {
    const pct = steps.length === 1 ? 100 : (currentStep / (steps.length - 1)) * 100
    return (
      <div className={cm.cn(cm.stack(2), className)}>
        <div className={cm.cn(cm.progress(), cm.progressHeight('sm'))}>
          <div
            className={cm.cn(cm.progressBar(), cm.progressColor('primary'))}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className={cm.flex({ justify: 'between' })}>
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={cm.cn(
                cm.textSize('xs'),
                i === currentStep ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
              )}
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'cards') {
    return (
      <div
        className={cm.cn(
          orientation === 'vertical' ? cm.stack(2) : cm.flex({ align: 'stretch', gap: 'sm' }),
          className,
        )}
      >
        {steps.map((s, i) => {
          const st = statusOf(i, s.status)
          return (
            <button
              key={s.id}
              type="button"
              onClick={st === 'completed' && onStepClick ? () => onStepClick(s.id, i) : undefined}
              aria-current={st === 'current' ? 'step' : undefined}
              disabled={!onStepClick || st === 'pending'}
              className={cm.cn(cm.flex1, cm.sp('p', 3), cm.stack(1 as const))}
            >
              <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                {i + 1}. {s.label}
              </span>
              {s.description && <span className={cm.textSize('xs')}>{s.description}</span>}
            </button>
          )
        })}
      </div>
    )
  }

  // dots
  return (
    <div
      className={cm.cn(
        orientation === 'vertical' ? cm.stack(2) : cm.flex({ align: 'center', gap: 'sm' }),
        className,
      )}
    >
      {steps.map((s, i) => {
        const st = statusOf(i, s.status)
        const isLast = i === steps.length - 1
        return (
          <div
            key={s.id}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              !isLast ? cm.flex1 : undefined,
            )}
          >
            <button
              type="button"
              onClick={onStepClick ? () => onStepClick(s.id, i) : undefined}
              aria-current={st === 'current' ? 'step' : undefined}
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                cm.cn(cm.textSize('xs'), cm.fontWeight('bold')),
              )}
            >
              {st === 'completed' ? '✓' : i + 1}
            </button>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                st === 'current' ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
              )}
            >
              {s.label}
            </span>
            {!isLast && orientation === 'horizontal' && (
              <span
                aria-hidden
                className={cm.cn(cm.flex1, cm.h(0 as const))}
                style={{ borderTop: '1px solid currentColor', opacity: 0.2 }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
