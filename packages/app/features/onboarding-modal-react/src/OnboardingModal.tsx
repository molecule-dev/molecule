import type { ReactNode } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Modal } from '@molecule/app-ui-react'

/**
 *
 */
export interface OnboardingStep {
  id: string
  title: ReactNode
  body: ReactNode
  /** Optional media / illustration. */
  media?: ReactNode
}

interface OnboardingModalProps {
  /** Whether the modal is open. */
  open: boolean
  /** Called when closing (skip / X / completion). */
  onClose: () => void
  /** Onboarding steps. */
  steps: OnboardingStep[]
  /** Called when the user clicks "Done" on the last step. */
  onComplete?: () => void
  /** Show "Skip" link in the footer. Defaults to true. */
  allowSkip?: boolean
  /** Initial step index (uncontrolled). */
  defaultStep?: number
}

/**
 * Multi-step onboarding overlay — title + body + media, with prev/next
 * navigation and an optional Skip link. Tracks its own step state.
 * @param root0
 * @param root0.open
 * @param root0.onClose
 * @param root0.steps
 * @param root0.onComplete
 * @param root0.allowSkip
 * @param root0.defaultStep
 */
export function OnboardingModal({
  open,
  onClose,
  steps,
  onComplete,
  allowSkip = true,
  defaultStep = 0,
}: OnboardingModalProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [step, setStep] = useState(defaultStep)
  const total = steps.length
  if (total === 0) return null
  const current = steps[Math.max(0, Math.min(step, total - 1))]
  const isLast = step >= total - 1

  /**
   *
   */
  function next() {
    if (isLast) {
      onComplete?.()
      onClose()
    } else setStep((s) => s + 1)
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className={cm.stack(4)}>
        {current.media && (
          <div className={cm.flex({ align: 'center', justify: 'center' })}>{current.media}</div>
        )}
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>{current.title}</h2>
        <div className={cm.textSize('sm')}>{current.body}</div>
        <footer className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
          <div className={cm.flex({ align: 'center', gap: 'xs' })}>
            {steps.map((s, i) => (
              <span
                key={s.id}
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: i === step ? 'currentColor' : 'rgba(0,0,0,0.2)',
                }}
              />
            ))}
          </div>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            {allowSkip && !isLast && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                {t('onboarding.skip', {}, { defaultValue: 'Skip' })}
              </Button>
            )}
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                {t('onboarding.back', {}, { defaultValue: 'Back' })}
              </Button>
            )}
            <Button variant="solid" color="primary" onClick={next}>
              {isLast
                ? t('onboarding.done', {}, { defaultValue: 'Get started' })
                : t('onboarding.next', {}, { defaultValue: 'Next' })}
            </Button>
          </div>
        </footer>
      </div>
    </Modal>
  )
}
