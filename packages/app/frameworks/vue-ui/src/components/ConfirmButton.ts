/**
 * ConfirmButton component — the two-step destructive-action button.
 *
 * Vue port of `@molecule/app-ui-react`'s ConfirmButton (see that source for
 * the design notes). The first click ARMS the button ("Confirm?"), the second
 * commits; it auto-disarms after `disarmSeconds` (default 4s) and Escape
 * disarms it.
 *
 * @example
 * ```ts
 * import { ConfirmButton } from '@molecule/app-ui-vue'
 * ```
 *
 * @module
 */

import { defineComponent, h, onUnmounted, type PropType, ref, type VNodeChild, watch } from 'vue'

import { OverlayLayer } from '@molecule/app-overlay-dom'
import type { ButtonProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'
import { useElementRef } from '../utilities/elementRef.js'

/** The arm/commit lifecycle a {@link ConfirmButton} moves through. */
type ConfirmPhase = 'idle' | 'armed' | 'pending'

/**
 * Props for {@link ConfirmButton}.
 *
 * Vue port of `@molecule/app-ui-react`'s `ConfirmButtonProps`: the button
 * props React's declaration inherits (minus the ones this component owns or
 * forwards itself), with React's `ReactNode` labels as nodes. Anything else
 * a caller passes — `data-*`, `aria-*`, DOM listeners — falls through to the
 * rendered button, as React's `...rest` does.
 */
export interface ConfirmButtonProps extends Omit<
  ButtonProps,
  'onClick' | 'children' | 'onConfirm' | 'type' | 'value'
> {
  /**
   * Fired ONLY on the confirming (second) click — when the action actually
   * commits. Declared as a plain prop (not an emit) because the button
   * AWAITS its return to decide when to return to idle.
   */
  onConfirm: () => void | Promise<void>
  /** Visible label in the idle (armed-to-be-clicked) state. */
  label?: VNodeChild
  /** Visible label in the armed state — the "click again to confirm" step. */
  confirmLabel?: VNodeChild
  /** Visible label while `onConfirm` is pending. */
  pendingLabel?: VNodeChild
  /**
   * Seconds before the armed state auto-disarms back to idle; `0` disables
   * auto-disarm.
   */
  disarmSeconds?: number
  /** Disable the control entirely (idle and confirming states). */
  disabled?: boolean
  /** data-mol-id for the button (all states share one element). */
  testId?: string
}

/**
 * Two-step destructive-action button: the first click ARMS it ("Confirm?"),
 * the second commits. Auto-disarms after `disarmSeconds` (default 4s) so an
 * armed-then-abandoned row can't surprise anyone later; the armed state is
 * announced through `aria-live`, and Escape disarms.
 *
 * While the `onConfirm` promise is pending the button stays in its pending
 * state (label `pendingLabel`, disabled) and ignores further clicks.
 *
 * @param props - Component props (onConfirm/label/confirmLabel/pendingLabel/
 * disarmSeconds/disabled/testId plus ButtonProps).
 */
export const ConfirmButton = defineComponent({
  name: 'MConfirmButton',
  inheritAttrs: false,
  props: {
    /**
     * Fired ONLY on the confirming (second) click — when the action actually
     * commits. Declared as a plain prop (not an emit) because the button
     * AWAITS its return to decide when to return to idle.
     */
    onConfirm: {
      type: Function as PropType<ConfirmButtonProps['onConfirm']>,
      required: true,
    },
    /** Visible label in the idle (armed-to-be-clicked) state. */
    label: null,
    /** Visible label in the armed state — the "click again to confirm" step. */
    confirmLabel: null,
    /** Visible label while `onConfirm` is pending. */
    pendingLabel: null,
    /**
     * Seconds before the armed state auto-disarms back to idle; `0` disables
     * auto-disarm.
     */
    disarmSeconds: {
      type: Number as PropType<ConfirmButtonProps['disarmSeconds']>,
      default: 4,
    },
    /** Disable the control entirely (idle and confirming states). */
    disabled: {
      type: Boolean as PropType<ConfirmButtonProps['disabled']>,
      default: false,
    },
    /** data-mol-id for the button (all states share one element). */
    testId: String as PropType<ConfirmButtonProps['testId']>,
    color: String as PropType<ConfirmButtonProps['color']>,
    size: String as PropType<ConfirmButtonProps['size']>,
    variant: String as PropType<ConfirmButtonProps['variant']>,
    className: String as PropType<ConfirmButtonProps['className']>,
    style: [String, Object] as PropType<ConfirmButtonProps['style']>,
  },
  setup(props, { attrs, slots, expose }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const element = useElementRef<HTMLButtonElement>(expose)
    const phase = ref<ConfirmPhase>('idle')
    let disarmTimer: ReturnType<typeof setTimeout> | null = null

    const disarm = (): void => {
      if (disarmTimer) clearTimeout(disarmTimer)
      disarmTimer = null
      phase.value = 'idle'
    }

    // The disarm timer: set when armed (and disarmSeconds > 0), cleared on
    // every phase/disarmSeconds change — exactly React's effect + cleanup.
    watch([phase, () => props.disarmSeconds], () => {
      if (disarmTimer) {
        clearTimeout(disarmTimer)
        disarmTimer = null
      }
      if (phase.value === 'armed' && props.disarmSeconds > 0) {
        disarmTimer = setTimeout(disarm, props.disarmSeconds * 1000)
      }
    })

    const layer = new OverlayLayer()
    watch(
      [phase, element],
      ([current, node]) => {
        const target = { current: node }
        layer.sync({
          open: current === 'armed',
          kind: 'popover',
          surface: target,
          anchor: target,
          dismissKey: true,
          onDismiss: disarm,
        })
      },
      { flush: 'post' },
    )

    onUnmounted(() => {
      if (disarmTimer) clearTimeout(disarmTimer)
      layer.release()
    })

    const handleClick = async (): Promise<void> => {
      if (phase.value === 'idle') {
        phase.value = 'armed'
        return
      }
      if (phase.value === 'pending') return
      phase.value = 'pending'
      try {
        await props.onConfirm()
      } catch (_error) {
        // A rejected confirm means the action failed: the caller owns that
        // error and shows its own message, and the button returns to idle so
        // the user can retry. Ignoring it here only stops it becoming an
        // unhandled rejection.
      } finally {
        phase.value = 'idle'
      }
    }

    return () => {
      const label = props.label ?? slots.label?.()
      const confirmLabel = props.confirmLabel ?? slots.confirmLabel?.()
      const pendingLabel = props.pendingLabel ?? slots.pendingLabel?.()

      const visibleLabel =
        phase.value === 'pending'
          ? (pendingLabel ?? t('confirmButton.pending', {}, { defaultValue: 'Working…' }))
          : phase.value === 'armed'
            ? (confirmLabel ?? t('confirmButton.confirm', {}, { defaultValue: 'Confirm?' }))
            : label

      return h(
        'button',
        {
          ref: element,
          type: 'button',
          onClick: () => {
            void handleClick()
          },
          disabled: props.disabled || phase.value === 'pending',
          'aria-live': 'polite',
          'data-state': phase.value,
          'data-testid': props.testId,
          class: cm.cn(
            cm.button({
              color: phase.value === 'armed' ? 'error' : (props.color ?? 'primary'),
              size: props.size,
              variant: props.variant,
            }),
            ...classOf(props.className, attrs),
          ),
          style: styleOf(props.style, attrs),
          ...restAttrs(attrs),
        },
        [visibleLabel],
      )
    }
  },
})
