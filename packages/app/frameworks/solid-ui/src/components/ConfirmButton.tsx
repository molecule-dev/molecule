/**
 * ConfirmButton component.
 *
 * @module
 */

import {
  type Component,
  createEffect,
  createSignal,
  type JSX,
  on,
  onCleanup,
  splitProps,
} from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import type { ButtonProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'

/**
 * Props for {@link ConfirmButton}.
 */
export interface ConfirmButtonProps extends Omit<
  ButtonProps,
  'onClick' | 'children' | 'loading' | 'loadingText' | 'type'
> {
  /**
   * Fired ONLY on the confirming (second) click — i.e. when the action
   * actually commits. Errors should be handled by the caller (render an
   * inline banner); while the returned promise is pending the button stays
   * in its confirming state and ignores further clicks.
   */
  onConfirm: () => void | Promise<void>
  /** Visible label in the idle (armed-to-be-clicked) state. */
  label: JSX.Element
  /**
   * Visible label in the armed state — the "click again to confirm" step.
   * Defaults to a localized "Confirm?" via the i18n bond.
   */
  confirmLabel?: JSX.Element
  /**
   * Visible label while {@link ConfirmButtonProps.onConfirm} is pending.
   * Defaults to a localized "Working…".
   */
  pendingLabel?: JSX.Element
  /**
   * Seconds before the armed state auto-disarms back to idle. `0` disables
   * auto-disarm.
   */
  disarmSeconds?: number
}

/**
 * Two-step destructive-action button: the first click ARMS it ("Confirm?"),
 * the second commits. Auto-disarms after {@link ConfirmButtonProps.disarmSeconds}
 * (default 4s) so an armed-then-abandoned row can't surprise anyone later.
 *
 * The whole button is the target, the armed state is announced through
 * `aria-live`, and Escape disarms.
 *
 * @param props - Component props (see {@link ConfirmButtonProps}).
 * @returns The rendered two-step button.
 */
export const ConfirmButton: Component<ConfirmButtonProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'onConfirm',
    'label',
    'confirmLabel',
    'pendingLabel',
    'disarmSeconds',
    'disabled',
    'testId',
    'className',
    'style',
    'color',
    'size',
    'variant',
  ])

  const cm = getClassMap()
  const { t } = useTranslation()
  const [phase, setPhase] = createSignal<'idle' | 'armed' | 'pending'>('idle')
  const disarmSeconds = (): number => local.disarmSeconds ?? 4

  /**
   * Returns the button to idle and cancels any pending auto-disarm.
   */
  const disarm = (): void => {
    setPhase('idle')
  }

  // The armed state schedules exactly one auto-disarm; leaving the state (and
  // unmounting) clears it.
  createEffect(
    on(phase, (current) => {
      if (current !== 'armed' || disarmSeconds() <= 0) return
      const timer = setTimeout(disarm, disarmSeconds() * 1000)
      onCleanup(() => clearTimeout(timer))
    }),
  )

  // Escape disarms while armed.
  createEffect(
    on(phase, (current) => {
      if (current !== 'armed') return
      const onKey = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') disarm()
      }
      window.addEventListener('keydown', onKey)
      onCleanup(() => window.removeEventListener('keydown', onKey))
    }),
  )

  /**
   * Arms on the first click, commits on the second.
   *
   * @returns A promise resolving when the commit settles.
   */
  const handleClick = async (): Promise<void> => {
    if (phase() === 'idle') {
      setPhase('armed')
      return
    }
    if (phase() === 'pending') return
    setPhase('pending')
    try {
      await local.onConfirm()
    } catch (_error) {
      // A rejected confirm means the action failed: the caller owns that
      // error and shows its own message, and the button returns to idle so
      // the user can retry. Ignoring it here only stops it becoming an
      // unhandled rejection.
    } finally {
      setPhase('idle')
    }
  }

  const visibleLabel = (): JSX.Element =>
    phase() === 'pending'
      ? (local.pendingLabel ?? t('confirmButton.pending', {}, { defaultValue: 'Working…' }))
      : phase() === 'armed'
        ? (local.confirmLabel ?? t('confirmButton.confirm', {}, { defaultValue: 'Confirm?' }))
        : local.label

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={local.disabled || phase() === 'pending'}
      aria-live="polite"
      data-state={phase()}
      data-testid={local.testId}
      class={cm.cn(
        cm.button({
          color: phase() === 'armed' ? 'error' : (local.color ?? 'primary'),
          size: local.size,
          variant: local.variant,
        }),
        local.className,
      )}
      style={toStyleProps(local.style)}
      {...(rest as JSX.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {visibleLabel()}
    </button>
  )
}
