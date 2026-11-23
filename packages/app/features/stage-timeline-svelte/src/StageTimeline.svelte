<!--
  StageTimeline: the Svelte counterpart of `@molecule/app-stage-timeline-react`'s
  `StageTimeline` — multi-stage horizontal progress timeline with a
  current-stage marker. Same props (React names), same ClassMap tokens, same
  inline styles, same DOM for the same input.

  Labels and subtitles are snippets (a data prop's nodes become snippets in
  Svelte), or plain text; every visible/accessible string goes through `t()` so
  a locale switch re-renders it. Stages are keyed by their `id`, so a re-passed
  or re-ordered stage list keeps each marker's DOM the way React's `key` does.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { statusOf } from './status.js'
  import type { StageStatus, StageTimelineProps, StageTimelineStage } from './types.js'

  let { stages, currentIndex, dataMolId, className }: StageTimelineProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so these re-run on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const groupLabel = $derived(t('stageTimeline.group', {}, { defaultValue: 'Stage timeline' }))
  const ariaLabels = $derived.by(() => stages.map((stage, i) => stageAria(stage, i)))

  /**
   * Whether a stage field carries a snippet rather than plain text.
   *
   * @param value - The stage field.
   * @returns True when the field renders as a snippet.
   */
  function isSnippet(value: unknown): value is Snippet {
    return typeof value === 'function'
  }

  /**
   * The text a stage field renders (React renders strings and numbers as text).
   *
   * @param value - The stage field.
   * @returns The text, or `''` for an absent or snippet value.
   */
  function textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }

  /**
   * The stage's accessible label, built from the same i18n key and default
   * message React uses (only a plain string label is carried into it).
   *
   * @param stage - The stage.
   * @param index - The stage's zero-based index.
   * @returns The aria label.
   */
  function stageAria(stage: StageTimelineStage, index: number): string {
    return t(
      'stageTimeline.stage',
      {
        label: typeof stage.label === 'string' ? stage.label : '',
        index: index + 1,
        total: stages.length,
        status: statusOf(index, currentIndex),
      },
      { defaultValue: 'Stage {{index}} of {{total}}: {{label}} ({{status}})' },
    )
  }

  /**
   * One stage's dot style. Numbers carry their unit in the string, because
   * only React's style object adds `px` to a bare number; the serialized style
   * is what every framework must match.
   *
   * @param stage - The stage the dot belongs to.
   * @param status - The stage's rendering status.
   * @returns The dot's inline style.
   */
  function dotStyle(stage: StageTimelineStage, status: StageStatus): string {
    const completed = status === 'completed'
    const current = status === 'current'
    return [
      'width: 28px',
      'height: 28px',
      'border-radius: 50%',
      `border: 2px solid ${
        completed || current
          ? 'var(--mol-color-primary, #3366ff)'
          : 'var(--mol-color-outline, rgba(0,0,0,0.25))'
      }`,
      `background: ${
        completed
          ? 'var(--mol-color-primary, #3366ff)'
          : current
            ? 'var(--mol-color-primary-container, rgba(51,102,255,0.18))'
            : 'var(--mol-color-surface, transparent)'
      }`,
      `color: ${completed ? 'var(--mol-color-on-primary, #fff)' : 'inherit'}`,
      'display: inline-flex',
      'align-items: center',
      'justify-content: center',
      'font-size: 14px',
      'font-weight: 700',
      `cursor: ${stage.onClick ? 'pointer' : 'default'}`,
      ...(current
        ? ['box-shadow: 0 0 0 4px var(--mol-color-primary-container, rgba(51,102,255,0.18))']
        : []),
      'transition: box-shadow 200ms ease, background 200ms ease',
      // React merges `{ ...dotStyle, padding: 0 }` onto the button.
      'padding: 0px',
    ].join('; ')
  }

  /**
   * The stage label's color for a given status.
   *
   * @param status - The stage's rendering status.
   * @returns The CSS color.
   */
  function labelColor(status: StageStatus): string {
    if (status === 'current') return 'var(--mol-color-primary, #3366ff)'
    if (status === 'completed') return 'var(--mol-color-on-surface, inherit)'
    return 'var(--mol-color-on-surface-variant, #666)'
  }
</script>

<div
  class={cm.cn(className)}
  role="list"
  aria-label={groupLabel}
  data-mol-id={dataMolId ?? 'stage-timeline'}
  style={stages.length === 0
    ? undefined
    : `position: relative; display: grid; grid-template-columns: repeat(${stages.length}, minmax(0, 1fr)); align-items: start`}
>
  {#if stages.length > 0}
    <div
      aria-hidden="true"
      style="position: absolute; top: 14px; left: {(0.5 / stages.length) * 100}%; right: {(0.5 /
        stages.length) *
        100}%; height: 2px; pointer-events: none"
      data-mol-id="stage-timeline-rail"
    >
      <div
        style="position: absolute; inset: 0px; background: var(--mol-color-surface-variant, rgba(0,0,0,0.12))"
      ></div>
      <div
        style="position: absolute; top: 0px; bottom: 0px; left: 0px; width: {Math.max(
          0,
          Math.min(1, currentIndex / Math.max(1, stages.length - 1)),
        ) * 100}%; background: var(--mol-color-primary, #3366ff); transition: width 200ms ease"
        data-mol-id="stage-timeline-rail-fill"
      ></div>
    </div>
    {#each stages as stage, i (stage.id)}
      {@const status = statusOf(i, currentIndex)}
      <div
        role="listitem"
        data-stage-id={stage.id}
        data-stage-status={status}
        data-mol-id="stage-timeline-stage"
        aria-current={status === 'current' ? 'step' : undefined}
        aria-label={ariaLabels[i]}
        style="position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0px"
      >
        <button
          type="button"
          onclick={stage.onClick}
          disabled={!stage.onClick}
          aria-label={ariaLabels[i]}
          data-mol-id="stage-timeline-dot"
          style={dotStyle(stage, status)}
        >
          {status === 'completed' ? '✓' : i + 1}
        </button>
        <span
          class={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight(status === 'current' ? 'semibold' : 'normal'),
          )}
          data-mol-id="stage-timeline-label"
          style="text-align: center; color: {labelColor(status)}"
        >
          {#if isSnippet(stage.label)}{@render stage.label?.()}{:else}{textOf(stage.label)}{/if}
        </span>
        {#if stage.subtitle}
          <span
            class={cm.textSize('xs')}
            data-mol-id="stage-timeline-subtitle"
            style="text-align: center; color: var(--mol-color-on-surface-variant, #888)"
          >
            {#if isSnippet(stage.subtitle)}{@render stage.subtitle?.()}{:else}{textOf(
                stage.subtitle,
              )}{/if}
          </span>
        {/if}
      </div>
    {/each}
  {/if}
</div>
