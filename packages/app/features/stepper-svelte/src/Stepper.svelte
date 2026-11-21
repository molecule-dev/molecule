<!--
  Stepper: the Svelte counterpart of `@molecule/app-stepper-react`'s `Stepper` —
  a multi-step progress indicator with `dots` / `bar` / `cards` variants and
  horizontal / vertical orientations. Same props (React names), same DOM for the
  same input, and the same `onStepClick(stepId, index)` calls.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { StepperProps, StepperStep, StepStatus } from './types.js'

  let {
    steps,
    currentStep,
    variant = 'dots',
    orientation = 'horizontal',
    onStepClick,
    className,
  }: StepperProps = $props()

  const cm = $derived(getClassMap())

  /**
   * Derives the display status for the step at index `i`.
   *
   * @param i - The step index.
   * @param explicit - The step's explicit status, when it has one.
   * @returns The status to render.
   */
  const statusOf = (i: number, explicit?: StepStatus): StepStatus => {
    if (explicit) return explicit
    if (i < currentStep) return 'completed'
    if (i === currentStep) return 'current'
    return 'pending'
  }

  /**
   * The filled-bar percentage: a single step is full, otherwise the current
   * index over the last index.
   *
   * @param list - The steps.
   * @returns The percentage (React's exact arithmetic).
   */
  const barPct = (list: StepperStep[]): number =>
    list.length === 1 ? 100 : (currentStep / (list.length - 1)) * 100
</script>

{#if variant === 'bar'}
  <div class={cm.cn(cm.stack(2), className)}>
    <div class={cm.cn(cm.progress(), cm.progressHeight('sm'))}>
      <div
        class={cm.cn(cm.progressBar(), cm.progressColor('primary'))}
        style="width: {barPct(steps)}%"
      ></div>
    </div>
    <div class={cm.flex({ justify: 'between' })}>
      {#each steps as s, i (s.id)}
        <span
          class={cm.cn(
            cm.textSize('xs'),
            i === currentStep ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
          )}
        >
          {#if typeof s.label === 'string'}{s.label}{:else}{@render s.label()}{/if}
        </span>
      {/each}
    </div>
  </div>
{:else if variant === 'cards'}
  <div
    class={cm.cn(
      orientation === 'vertical' ? cm.stack(2) : cm.flex({ align: 'stretch', gap: 'sm' }),
      className,
    )}
  >
    {#each steps as s, i (s.id)}
      <button
        type="button"
        data-mol-id="stepper-step-{s.id}"
        onclick={statusOf(i, s.status) === 'completed' && onStepClick
          ? () => onStepClick?.(s.id, i)
          : undefined}
        aria-current={statusOf(i, s.status) === 'current' ? 'step' : undefined}
        disabled={!onStepClick || statusOf(i, s.status) !== 'completed'}
        class={cm.cn(cm.flex1, cm.sp('p', 3), cm.stack(1))}
      >
        <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          {i + 1}. {#if typeof s.label === 'string'}{s.label}{:else}{@render s.label()}{/if}
        </span>
        {#if s.description}
          <span class={cm.textSize('xs')}>
            {#if typeof s.description === 'string'}{s.description}{:else}{@render s.description()}{/if}
          </span>
        {/if}
      </button>
    {/each}
  </div>
{:else}
  <div
    class={cm.cn(
      orientation === 'vertical' ? cm.stack(2) : cm.flex({ align: 'center', gap: 'sm' }),
      className,
    )}
  >
    {#each steps as s, i (s.id)}
      <div
        class={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          i !== steps.length - 1 ? cm.flex1 : undefined,
        )}
      >
        <button
          type="button"
          data-mol-id="stepper-step-{s.id}"
          onclick={onStepClick ? () => onStepClick?.(s.id, i) : undefined}
          disabled={!onStepClick}
          aria-current={statusOf(i, s.status) === 'current' ? 'step' : undefined}
          class={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.cn(cm.textSize('xs'), cm.fontWeight('bold')),
          )}
        >
          {statusOf(i, s.status) === 'completed' ? '✓' : i + 1}
        </button>
        <span
          class={cm.cn(
            cm.textSize('xs'),
            statusOf(i, s.status) === 'current'
              ? cm.fontWeight('semibold')
              : cm.fontWeight('medium'),
          )}
        >
          {#if typeof s.label === 'string'}{s.label}{:else}{@render s.label()}{/if}
        </span>
        {#if i !== steps.length - 1 && orientation === 'horizontal'}
          <span
            aria-hidden="true"
            class={cm.cn(cm.flex1, cm.h(0))}
            style="border-top: 1px solid; opacity: 0.2"
          ></span>
        {/if}
      </div>
    {/each}
  </div>
{/if}
