/**
 * Vue multi-step progress indicator: `dots` / `bar` / `cards` variants.
 *
 * Vue counterpart of `@molecule/app-stepper-react`'s `Stepper` — the same
 * props (React names), the same DOM for the same input, and the same
 * `onStepClick(stepId, index)` calls.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { StepperProps, StepStatus } from './types.js'

/**
 * Multi-step progress indicator — useful for checkout flows, onboarding
 * wizards, course module progress, etc.
 *
 * Variants:
 * - `'dots'` — small numbered circles connected by a line.
 * - `'bar'` — horizontal filled bar with step labels above.
 * - `'cards'` — each step is a card with title + description.
 *
 * @param props - Component props (see {@link StepperProps}).
 * @returns The stepper component.
 */
export const Stepper = defineComponent({
  name: 'Stepper',
  props: {
    steps: {
      type: Array as PropType<StepperProps['steps']>,
      required: true,
    },
    currentStep: {
      type: Number,
      required: true,
    },
    variant: {
      type: String as PropType<'dots' | 'bar' | 'cards'>,
      default: 'dots',
    },
    orientation: {
      type: String as PropType<'horizontal' | 'vertical'>,
      default: 'horizontal',
    },
    onStepClick: {
      type: Function as PropType<(stepId: string, index: number) => void>,
      default: undefined,
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()

    /**
     * Derives the display status for the step at index `i`.
     * @param i - The step index.
     * @param explicit - The step's explicit status, when it has one.
     * @returns The status to render.
     */
    function statusOf(i: number, explicit?: StepStatus): StepStatus {
      if (explicit) return explicit
      if (i < props.currentStep) return 'completed'
      if (i === props.currentStep) return 'current'
      return 'pending'
    }

    /**
     * The label node for one step.
     * @param label - The step's ReactNode counterpart.
     * @returns The renderable children.
     */
    function labelOf(label: VNodeChild): VNodeChild[] {
      return [label]
    }

    return (): VNode => {
      if (props.variant === 'bar') {
        const pct =
          props.steps.length === 1 ? 100 : (props.currentStep / (props.steps.length - 1)) * 100
        return h('div', { class: cm.cn(cm.stack(2), props.className) }, [
          h('div', { class: cm.cn(cm.progress(), cm.progressHeight('sm')) }, [
            h('div', {
              class: cm.cn(cm.progressBar(), cm.progressColor('primary')),
              style: { width: `${pct}%` },
            }),
          ]),
          h(
            'div',
            { class: cm.flex({ justify: 'between' }) },
            props.steps.map((s, i) =>
              h(
                'span',
                {
                  key: s.id,
                  class: cm.cn(
                    cm.textSize('xs'),
                    i === props.currentStep ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
                  ),
                },
                labelOf(s.label),
              ),
            ),
          ),
        ])
      }

      if (props.variant === 'cards') {
        return h(
          'div',
          {
            class: cm.cn(
              props.orientation === 'vertical'
                ? cm.stack(2)
                : cm.flex({ align: 'stretch', gap: 'sm' }),
              props.className,
            ),
          },
          props.steps.map((s, i) => {
            const st = statusOf(i, s.status)
            return h(
              'button',
              {
                key: s.id,
                type: 'button',
                'data-mol-id': `stepper-step-${s.id}`,
                onClick:
                  st === 'completed' && props.onStepClick
                    ? () => props.onStepClick?.(s.id, i)
                    : undefined,
                'aria-current': st === 'current' ? 'step' : undefined,
                // Doc contract: in `cards` only completed steps are clickable,
                // every other step renders disabled.
                disabled: !props.onStepClick || st !== 'completed',
                class: cm.cn(cm.flex1, cm.sp('p', 3), cm.stack(1)),
              },
              [
                h('span', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) }, [
                  `${i + 1}. `,
                  s.label,
                ]),
                s.description
                  ? h('span', { class: cm.textSize('xs') }, labelOf(s.description))
                  : null,
              ],
            )
          }),
        )
      }

      // dots
      return h(
        'div',
        {
          class: cm.cn(
            props.orientation === 'vertical'
              ? cm.stack(2)
              : cm.flex({ align: 'center', gap: 'sm' }),
            props.className,
          ),
        },
        props.steps.map((s, i) => {
          const st = statusOf(i, s.status)
          const isLast = i === props.steps.length - 1
          return h(
            'div',
            {
              key: s.id,
              class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), !isLast ? cm.flex1 : undefined),
            },
            [
              h(
                'button',
                {
                  type: 'button',
                  'data-mol-id': `stepper-step-${s.id}`,
                  // Doc contract: in `dots` the handler fires for ANY step.
                  // With no handler the dot is a non-interactive indicator.
                  onClick: props.onStepClick ? () => props.onStepClick?.(s.id, i) : undefined,
                  disabled: !props.onStepClick,
                  'aria-current': st === 'current' ? 'step' : undefined,
                  class: cm.cn(
                    cm.w(8),
                    cm.h(8),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.cn(cm.textSize('xs'), cm.fontWeight('bold')),
                  ),
                },
                [st === 'completed' ? '✓' : i + 1],
              ),
              h(
                'span',
                {
                  class: cm.cn(
                    cm.textSize('xs'),
                    st === 'current' ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
                  ),
                },
                labelOf(s.label),
              ),
              !isLast && props.orientation === 'horizontal'
                ? h('span', {
                    'aria-hidden': true,
                    class: cm.cn(cm.flex1, cm.h(0)),
                    style: { borderTop: '1px solid currentColor', opacity: 0.2 },
                  })
                : null,
            ],
          )
        }),
      )
    }
  },
})
