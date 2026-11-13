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

import { defineComponent, h, onUnmounted, type PropType, ref, watch } from 'vue'

import type { ButtonProps, ButtonSize, ButtonVariant, ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { useTranslation } from '../hooks/useTranslation.js'
import { classOf, type FallthroughAttrs, restAttrs, styleOf } from '../utilities/attrs.js'

/** React's DOM-callback names that alias a differently spelled native event. */
const REACT_EVENT_ALIASES: Record<string, string> = {
  onDoubleClick: 'onDblclick',
}

/**
 * React forwards DOM callbacks in `...rest` verbatim (`onKeyDown`, …). Vue
 * only attaches a native listener for `on` + the DOM event name (`onKeydown`)
 * — it hyphenates anything after `on`, so React's camelCase spelling would
 * listen for an event nothing dispatches. Rewrites rest keys to the native
 * spelling: `on` + the lowercased DOM event name.
 *
 * @param attrs - The fallthrough attributes to spread onto a native element.
 * @returns The same attributes with event keys in Vue's native spelling.
 */
function nativeEventAttrs(attrs: FallthroughAttrs): FallthroughAttrs {
  const out: FallthroughAttrs = {}
  for (const [key, value] of Object.entries(attrs)) {
    out[
      REACT_EVENT_ALIASES[key] ?? (/^on[A-Z]/.test(key) ? `on${key.slice(2).toLowerCase()}` : key)
    ] = value
  }
  return out
}

/** The arm/commit lifecycle a {@link ConfirmButton} moves through. */
type ConfirmPhase = 'idle' | 'armed' | 'pending'

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
      type: Function as PropType<() => void | Promise<void>>,
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
      type: Number,
      default: 4,
    },
    /** Disable the control entirely (idle and confirming states). */
    disabled: {
      type: Boolean,
      default: false,
    },
    /** data-mol-id for the button (all states share one element). */
    testId: String,
    color: String as PropType<ColorVariant>,
    size: String as PropType<ButtonSize>,
    variant: String as PropType<ButtonVariant>,
    className: String,
    style: [String, Object] as PropType<ButtonProps['style']>,
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
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

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') disarm()
    }

    // Escape disarms — the listener lives only while armed, like React's
    // [phase] effect.
    watch(phase, (p) => {
      if (p === 'armed') window.addEventListener('keydown', onKey)
      else window.removeEventListener('keydown', onKey)
    })

    onUnmounted(() => {
      if (disarmTimer) clearTimeout(disarmTimer)
      window.removeEventListener('keydown', onKey)
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
          ...nativeEventAttrs(restAttrs(attrs)),
        },
        [visibleLabel],
      )
    }
  },
})
