/**
 * Solid multi-step onboarding overlay.
 *
 * Solid counterpart of `@molecule/app-onboarding-modal-react`'s
 * `OnboardingModal` — the same props (React names), the same ClassMap tokens,
 * the same i18n keys, and the same DOM for the same input: a modal with the
 * current step's media, title and body, jump-to-step dots, and the Skip /
 * Back / Next / Get-started controls. Step position is uncontrolled and
 * persists across close/reopen, exactly as React's `useState` does.
 *
 * @module
 */

import { type Component, createSignal, For, type JSX, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Modal } from '@molecule/app-ui-solid'

import type { OnboardingModalProps, OnboardingStep } from './types.js'

/**
 * Multi-step onboarding overlay — title + body + media, with prev/next
 * navigation and an optional Skip link. Tracks its own step state.
 *
 * Step position is UNCONTROLLED and persists across close/reopen — a user who
 * closed on step 3 reopens on step 3. Remount the component to restart from
 * `defaultStep`. `onComplete` fires only from the final-step button; closing
 * via Skip or the chrome close button calls `onClose` alone — persist
 * "onboarding seen" in `onClose` if skipping should count as done.
 *
 * @param props - Component props (see `OnboardingModalProps`).
 * @returns The rendered onboarding overlay, or nothing when there are no steps.
 */
export const OnboardingModal: Component<OnboardingModalProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  // React's `useState(defaultStep)`: read once, then owned by the component.
  const [step, setStep] = createSignal(props.defaultStep ?? 0)

  /** The step the content shows, clamped into the list (React's `Math.max`/`Math.min`). */
  const current = (): OnboardingStep =>
    props.steps[Math.max(0, Math.min(step(), props.steps.length - 1))] as OnboardingStep

  /** React's `allowSkip = true` default. */
  const allowSkip = (): boolean => props.allowSkip ?? true

  /** Whether the shown step carries media (React's truthiness check on the node). */
  const hasMedia = (): boolean => {
    const media = current().media
    return media !== undefined && media !== null && media !== false && media !== ''
  }

  /** Advance to the next step, or complete and close if on the last step. */
  const next = (): void => {
    if (step() >= props.steps.length - 1) {
      props.onComplete?.()
      props.onClose?.()
    } else setStep(step() + 1)
  }

  /** Step back one position (never below the starting index). */
  const back = (): void => {
    setStep(step() - 1)
  }

  /**
   * Close without completing (React's Skip / chrome close). React passes the
   * triggering click event through to `onClose` for those two buttons and
   * none for Escape, so any received event is forwarded.
   *
   * @param event - The click event that asked to close, when there was one.
   */
  const close = (event?: unknown): void => {
    if (event === undefined || event === null) props.onClose?.()
    else props.onClose?.(event)
  }

  /**
   * One dot's inline style: React sets the same four declarations, the active
   * one in `currentColor`.
   *
   * @param index - The dot's step index.
   * @returns The inline style object.
   */
  const dotStyle = (index: number): JSX.CSSProperties => ({
    width: '6px',
    height: '6px',
    'border-radius': '50%',
    background: index === step() ? 'currentColor' : 'rgba(0,0,0,0.2)',
  })

  return (
    <Show when={props.steps.length > 0}>
      <Modal open={props.open} onClose={close}>
        <div class={cm.stack(4)}>
          <Show when={hasMedia()}>
            <div class={cm.flex({ align: 'center', justify: 'center' })}>{current().media}</div>
          </Show>
          <h2 class={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>{current().title}</h2>
          <div class={cm.textSize('sm')}>{current().body}</div>
          <footer class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
            <div class={cm.flex({ align: 'center', gap: 'xs' })}>
              <For each={props.steps}>
                {(s, i) => <span aria-hidden="true" style={dotStyle(i())} />}
              </For>
            </div>
            <div class={cm.flex({ align: 'center', gap: 'sm' })}>
              <Show when={allowSkip() && step() < props.steps.length - 1}>
                <Button variant="ghost" size="sm" onClick={close}>
                  {t('onboarding.skip', {}, { defaultValue: 'Skip' })}
                </Button>
              </Show>
              <Show when={step() > 0}>
                <Button variant="ghost" size="sm" onClick={back}>
                  {t('onboarding.back', {}, { defaultValue: 'Back' })}
                </Button>
              </Show>
              <Button variant="solid" color="primary" onClick={next}>
                {step() >= props.steps.length - 1
                  ? t('onboarding.done', {}, { defaultValue: 'Get started' })
                  : t('onboarding.next', {}, { defaultValue: 'Next' })}
              </Button>
            </div>
          </footer>
        </div>
      </Modal>
    </Show>
  )
}
