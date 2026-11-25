/**
 * ConfirmButton component.
 *
 * @module
 */

import React, {
  forwardRef,
  type NamedExoticComponent,
  type RefAttributes,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useTranslation } from '@molecule/app-react'
import type { ButtonProps, ElementHandle } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Pressable, registerInline } from '@molecule/app-ui-react/elements'
import { useOverlayLayer } from '@molecule/app-ui-react/platform'

import { mergeRefs } from '../utilities/mergeRefs.js'
import { rootProps } from '../utilities/rootProps.js'

/**
 * Props for {@link ConfirmButton}.
 */
export interface ConfirmButtonProps extends Omit<
  ButtonProps,
  'onClick' | 'children' | 'onConfirm' | keyof React.DOMAttributes<ElementHandle>
> {
  /**
   * Fired ONLY on the confirming (second) click — i.e. when the action
   * actually commits. Errors should be handled by the caller (render an
   * inline banner); while the returned promise is pending the button stays
   * in its confirming state and ignores further clicks.
   */
  onConfirm: () => void | Promise<void>
  /**
   * Visible label in the idle (armed-to-be-clicked) state.
   */
  label: React.ReactNode
  /**
   * Visible label in the armed state — the "click again to confirm" step.
   * Defaults to a localized "Confirm?" via the i18n bond.
   */
  confirmLabel?: React.ReactNode
  /**
   * Visible label while {@link onConfirm} is pending. Defaults to a
   * localized "Working…".
   */
  pendingLabel?: React.ReactNode
  /**
   * Seconds before the armed state auto-disarms back to idle. Low-stakes
   * actions tolerate a long window; destructive ones should keep it short.
   * `0` disables auto-disarm (not recommended — a stray click then leaves
   * the button armed forever).
   */
  disarmSeconds?: number
  /**
   * Disable the control entirely (idle and confirming states).
   */
  disabled?: boolean
  /**
   * data-mol-id for the button (all states share one element).
   */
  testId?: string
}

/**
 * Two-step destructive-action button: the first click ARMS it ("Confirm?"),
 * the second commits. Auto-disarms after {@link ConfirmButtonProps.disarmSeconds}
 * (default 4s) so an armed-then-abandoned row can't surprise anyone later.
 *
 * Replaces the fleet's hand-rolled arm-confirm pattern (previously
 * reimplemented per app — button flips, dialogs, `window.confirm`, or worse,
 * nothing at all) with one accessible, touch-friendly implementation:
 * the whole button is the target (≥36px via the button CVA), the armed
 * state is announced through `aria-live`, and Escape disarms.
 *
 * @example
 * ```tsx
 * <ConfirmButton
 *   label="Delete"
 *   confirmLabel="Confirm delete?"
 *   onConfirm={() => deleteClient(client.id)}
 *   testId="client-delete"
 * />
 * ```
 */
export const ConfirmButton: NamedExoticComponent<
  ConfirmButtonProps & RefAttributes<ElementHandle>
> = forwardRef<ElementHandle, ConfirmButtonProps>(
  (
    {
      onConfirm,
      label,
      confirmLabel,
      pendingLabel,
      disarmSeconds = 4,
      disabled,
      testId,
      className,
      color,
      size,
      variant,
      style,
      ...rest
    },
    ref,
  ) => {
    const cm = getClassMap()
    const { t } = useTranslation()
    const [phase, setPhase] = useState<'idle' | 'armed' | 'pending'>('idle')
    const disarmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const surface = useRef<ElementHandle>(null)
    const setSurface = useMemo(() => mergeRefs(ref, surface), [ref])

    const disarm = (): void => {
      if (disarmTimer.current) clearTimeout(disarmTimer.current)
      disarmTimer.current = null
      setPhase('idle')
    }

    useEffect(
      () => () => {
        if (disarmTimer.current) clearTimeout(disarmTimer.current)
      },
      [],
    )

    useEffect(() => {
      if (phase !== 'armed' || disarmSeconds <= 0) return
      disarmTimer.current = setTimeout(disarm, disarmSeconds * 1000)
      return () => {
        if (disarmTimer.current) clearTimeout(disarmTimer.current)
      }
    }, [phase, disarmSeconds])

    useOverlayLayer({
      open: phase === 'armed',
      kind: 'popover',
      surface,
      anchor: surface,
      dismissKey: true,
      onDismiss: disarm,
    })

    const handleClick = async (): Promise<void> => {
      if (phase === 'idle') {
        setPhase('armed')
        return
      }
      if (phase === 'pending') return
      setPhase('pending')
      try {
        await onConfirm()
      } catch (_error) {
        // A rejected confirm means the action failed: the caller owns that
        // error and shows its own message, and the button returns to idle so
        // the user can retry. Ignoring it here only stops it becoming an
        // unhandled rejection.
      } finally {
        setPhase('idle')
      }
    }

    const visibleLabel =
      phase === 'pending'
        ? (pendingLabel ?? t('confirmButton.pending', {}, { defaultValue: 'Working…' }))
        : phase === 'armed'
          ? (confirmLabel ?? t('confirmButton.confirm', {}, { defaultValue: 'Confirm?' }))
          : label

    return (
      <Pressable
        as="button"
        ref={setSurface}
        type="button"
        onClick={() => void handleClick()}
        disabled={disabled || phase === 'pending'}
        aria-live="polite"
        data-state={phase}
        data-testid={testId}
        className={cm.cn(
          cm.button({ color: phase === 'armed' ? 'error' : (color ?? 'primary'), size, variant }),
          className,
        )}
        webStyle={style}
        {...rootProps(rest)}
      >
        {visibleLabel}
      </Pressable>
    )
  },
)

ConfirmButton.displayName = 'ConfirmButton'

// A button sits in a line of text, as an inline-block button does on the web.
registerInline(ConfirmButton, () => 'box')
