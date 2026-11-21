/**
 * Solid multi-step progress indicator: `dots` / `bar` / `cards` variants.
 *
 * Solid counterpart of `@molecule/app-stepper-react`'s `Stepper` — the same
 * props (React names), the same DOM for the same input, and the same
 * `onStepClick(stepId, index)` calls.
 *
 * @module
 */

import { type Component, For, Show } from 'solid-js'

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
 * @returns The rendered stepper.
 */
export const Stepper: Component<StepperProps> = (props) => {
  const cm = getClassMap()
  const variant = (): 'dots' | 'bar' | 'cards' => props.variant ?? 'dots'
  const orientation = (): 'horizontal' | 'vertical' => props.orientation ?? 'horizontal'

  /**
   * Derives the display status for the step at index `i`.
   * @param i - The step index.
   * @param explicit - The step's explicit status, when it has one.
   * @returns The status to render.
   */
  const statusOf = (i: number, explicit?: StepStatus): StepStatus => {
    if (explicit) return explicit
    if (i < props.currentStep) return 'completed'
    if (i === props.currentStep) return 'current'
    return 'pending'
  }

  return (
    <Show
      when={variant() === 'bar'}
      fallback={
        <Show
          when={variant() === 'cards'}
          fallback={
            // dots
            <div
              class={cm.cn(
                orientation() === 'vertical'
                  ? cm.stack(2)
                  : cm.flex({ align: 'center', gap: 'sm' }),
                props.className,
              )}
            >
              <For each={props.steps}>
                {(s, i) => {
                  const st = (): StepStatus => statusOf(i(), s.status)
                  const isLast = (): boolean => i() === props.steps.length - 1
                  return (
                    <div
                      class={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        !isLast() ? cm.flex1 : undefined,
                      )}
                    >
                      <button
                        type="button"
                        data-mol-id={`stepper-step-${s.id}`}
                        // Doc contract: in `dots` the handler fires for ANY step.
                        // With no handler the dot is a non-interactive indicator.
                        onClick={
                          props.onStepClick ? () => props.onStepClick?.(s.id, i()) : undefined
                        }
                        disabled={!props.onStepClick}
                        aria-current={st() === 'current' ? 'step' : undefined}
                        class={cm.cn(
                          cm.w(8),
                          cm.h(8),
                          cm.roundedFull,
                          cm.flex({ align: 'center', justify: 'center' }),
                          cm.cn(cm.textSize('xs'), cm.fontWeight('bold')),
                        )}
                      >
                        {st() === 'completed' ? '✓' : i() + 1}
                      </button>
                      <span
                        class={cm.cn(
                          cm.textSize('xs'),
                          st() === 'current' ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
                        )}
                      >
                        {s.label}
                      </span>
                      <Show when={!isLast() && orientation() === 'horizontal'}>
                        <span
                          aria-hidden="true"
                          class={cm.cn(cm.flex1, cm.h(0))}
                          style={{ 'border-top': '1px solid', opacity: 0.2 }}
                        />
                      </Show>
                    </div>
                  )
                }}
              </For>
            </div>
          }
        >
          {/* cards */}
          <div
            class={cm.cn(
              orientation() === 'vertical' ? cm.stack(2) : cm.flex({ align: 'stretch', gap: 'sm' }),
              props.className,
            )}
          >
            <For each={props.steps}>
              {(s, i) => {
                const st = (): StepStatus => statusOf(i(), s.status)
                return (
                  <button
                    type="button"
                    data-mol-id={`stepper-step-${s.id}`}
                    onClick={
                      st() === 'completed' && props.onStepClick
                        ? () => props.onStepClick?.(s.id, i())
                        : undefined
                    }
                    aria-current={st() === 'current' ? 'step' : undefined}
                    // Doc contract: in `cards` only completed steps are clickable,
                    // every other step renders disabled.
                    disabled={!props.onStepClick || st() !== 'completed'}
                    class={cm.cn(cm.flex1, cm.sp('p', 3), cm.stack(1))}
                  >
                    <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                      {i() + 1}. {s.label}
                    </span>
                    <Show when={s.description}>
                      <span class={cm.textSize('xs')}>{s.description}</span>
                    </Show>
                  </button>
                )
              }}
            </For>
          </div>
        </Show>
      }
    >
      {/* bar */}
      <div class={cm.cn(cm.stack(2), props.className)}>
        <div class={cm.cn(cm.progress(), cm.progressHeight('sm'))}>
          <div
            class={cm.cn(cm.progressBar(), cm.progressColor('primary'))}
            style={{ width: `${barPct(props)}%` }}
          />
        </div>
        <div class={cm.flex({ justify: 'between' })}>
          <For each={props.steps}>
            {(s, i) => (
              <span
                class={cm.cn(
                  cm.textSize('xs'),
                  i() === props.currentStep ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
                )}
              >
                {s.label}
              </span>
            )}
          </For>
        </div>
      </div>
    </Show>
  )
}

/**
 * The filled-bar percentage: a single step is full, otherwise the current
 * index over the last index.
 *
 * @param props - The stepper props.
 * @returns The percentage (React's exact arithmetic).
 */
const barPct = (props: StepperProps): number =>
  props.steps.length === 1 ? 100 : (props.currentStep / (props.steps.length - 1)) * 100
