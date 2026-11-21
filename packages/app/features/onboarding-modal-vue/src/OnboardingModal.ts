/**
 * Vue multi-step onboarding overlay.
 *
 * Vue counterpart of `@molecule/app-onboarding-modal-react`'s
 * `OnboardingModal` — the same props (React names), the same ClassMap tokens,
 * the same i18n keys, and the same DOM for the same input: a modal with the
 * current step's media, title and body, jump-to-step dots, and the Skip /
 * Back / Next / Get-started controls. Step position is uncontrolled and
 * persists across close/reopen, exactly as React's `useState` does.
 *
 * @module
 */

import {
  computed,
  defineComponent,
  h,
  type PropType,
  ref,
  useId,
  type VNode,
  type VNodeChild,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Modal } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { OnboardingStep } from './types.js'

/**
 * Resolves a node-valued field to the children to render: an absent value
 * contributes nothing, and an array (several nodes) renders as several
 * children.
 *
 * The array is copied: the conformance kit hands a multi-node prop value as
 * one array instance, and Vue's patch compares the old and new children by
 * reference — reusing the same array makes the re-render recurse.
 *
 * @param value - The node value, when the caller passed one.
 * @returns The children to render.
 */
const nodesOf = (value: VNodeChild | undefined): VNodeChild[] => {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? [...value] : [value]
}

/**
 * Multi-step onboarding overlay — title + body + media, with prev/next
 * navigation and an optional Skip link. Tracks its own step state.
 *
 * Step position is UNCONTROLLED and persists across close/reopen — a user who
 * closed on step 3 reopens on step 3. Remount the component (e.g. with a new
 * `key`) to restart from `defaultStep`. `onComplete` fires only from the
 * final-step button; closing via Skip or the chrome close button calls
 * `onClose` alone — persist "onboarding seen" in `onClose` if skipping should
 * count as done.
 *
 * @param props - Component props (see `OnboardingModalProps`).
 * @returns The onboarding overlay component, or nothing when there are no
 * steps.
 */
export const OnboardingModal = defineComponent({
  name: 'OnboardingModal',
  props: {
    /** Whether the modal is open. */
    open: {
      type: Boolean,
      required: true,
    },
    /** Called when closing (skip / X / completion). */
    onClose: {
      type: Function as PropType<(event?: unknown) => void>,
      default: undefined,
    },
    /** Onboarding steps. */
    steps: {
      type: Array as PropType<OnboardingStep[]>,
      default: () => [],
    },
    /** Called when the user clicks "Done" on the last step. */
    onComplete: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    /** Show "Skip" link in the footer (defaults to true). */
    allowSkip: {
      type: Boolean,
      default: true,
    },
    /** Initial step index (uncontrolled; React's `useState` initial value). */
    defaultStep: {
      type: Number,
      default: 0,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    // Names the dialog after the current step's title (React's `useId()`): the
    // h2's id, handed to `Modal` as `aria-labelledby` — a `role="dialog"`
    // without an accessible name is an axe `aria-dialog-name` violation, and
    // the name must follow the step.
    const titleId = useId()
    // React's `useState(defaultStep)`: read once, then owned by the component.
    const step = ref(props.defaultStep)

    /** The step the content shows, clamped into the list (React's `Math.max`/`Math.min`). */
    const current = computed(
      (): OnboardingStep =>
        props.steps[Math.max(0, Math.min(step.value, props.steps.length - 1))] as OnboardingStep,
    )

    /** Advance to the next step, or complete and close if on the last step. */
    const next = (): void => {
      if (step.value >= props.steps.length - 1) {
        props.onComplete?.()
        props.onClose?.()
      } else step.value += 1
    }

    /** Step back one position (never below the starting index). */
    const back = (): void => {
      step.value -= 1
    }

    /**
     * Close without completing (React's Skip / chrome close). React passes the
     * triggering click event through to `onClose` for those two buttons and
     * none for Escape or the backdrop, so any received event is forwarded.
     *
     * @param event - The click event that asked to close, when there was one.
     */
    const close = (event?: unknown): void => {
      // Vue's event listener receives `null` for an emit without a payload
      // (Escape, the backdrop); React's `onClose` then gets no argument at all.
      if (event === undefined || event === null) props.onClose?.()
      else props.onClose?.(event)
    }

    return (): VNode | null => {
      const total = props.steps.length
      if (total === 0) return null
      const shown = current.value
      const isLast = step.value >= total - 1

      return h(
        Modal,
        { open: props.open, onClose: close, 'aria-labelledby': titleId },
        {
          default: () => [
            h('div', { class: cm.stack(4) }, [
              shown.media
                ? h(
                    'div',
                    { class: cm.flex({ align: 'center', justify: 'center' }) },
                    nodesOf(shown.media),
                  )
                : null,
              h(
                'h2',
                { id: titleId, class: cm.cn(cm.textSize('xl'), cm.fontWeight('bold')) },
                nodesOf(shown.title),
              ),
              h('div', { class: cm.textSize('sm') }, nodesOf(shown.body)),
              h('footer', { class: cm.flex({ align: 'center', justify: 'between', gap: 'sm' }) }, [
                h(
                  'div',
                  { class: cm.flex({ align: 'center', gap: 'xs' }) },
                  props.steps.map((s, i) =>
                    h('span', {
                      key: s.id,
                      'aria-hidden': true,
                      style: {
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: i === step.value ? 'currentColor' : 'rgba(0,0,0,0.2)',
                      },
                    }),
                  ),
                ),
                h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
                  props.allowSkip && !isLast
                    ? h(
                        Button,
                        { variant: 'ghost', size: 'sm', onClick: close },
                        { default: () => t('onboarding.skip', {}, { defaultValue: 'Skip' }) },
                      )
                    : null,
                  step.value > 0
                    ? h(
                        Button,
                        { variant: 'ghost', size: 'sm', onClick: back },
                        { default: () => t('onboarding.back', {}, { defaultValue: 'Back' }) },
                      )
                    : null,
                  h(
                    Button,
                    { variant: 'solid', color: 'primary', onClick: next },
                    {
                      default: () =>
                        isLast
                          ? t('onboarding.done', {}, { defaultValue: 'Get started' })
                          : t('onboarding.next', {}, { defaultValue: 'Next' }),
                    },
                  ),
                ]),
              ]),
            ]),
          ],
        },
      )
    }
  },
})
