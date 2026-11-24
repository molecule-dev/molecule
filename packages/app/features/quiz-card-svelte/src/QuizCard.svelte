<!--
  QuizCard: the Svelte counterpart of `@molecule/app-quiz-card-react`'s
  `QuizCard` — a single quiz question with multiple-choice options, an
  optional progress/timer header, and correct/incorrect feedback on submit.
  Same props, same DOM for the same input; the node-valued question, progress,
  timer and explanation props are snippets (or plain strings).
-->
<script lang="ts">
  import { PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Card } from '@molecule/app-ui-svelte'

  import type { QuizCardProps } from './types.js'

  let {
    question,
    options,
    correctId,
    onAnswer,
    progress,
    timer,
    explanation,
    className,
  }: QuizCardProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  let selected = $state<string | null>(null)
  let submitted = $state(false)

  /** Validates the selection and fires onAnswer with the correctness flag. */
  function submit(): void {
    if (!selected || submitted) return
    submitted = true
    onAnswer?.(selected, correctId ? selected === correctId : undefined)
  }

  /**
   * The answer button's inline style — React's verdict colours and touch
   * radius, exactly (no background declared unless a verdict shows).
   *
   * @param isCorrect - Whether the verdict is a correct answer.
   * @param isWrong - Whether the verdict is a wrong answer.
   * @param isSelected - Whether the option is the current selection.
   * @returns The CSS text bound to the button.
   */
  function optionStyle(isCorrect: boolean, isWrong: boolean, isSelected: boolean): string {
    const success = 'var(--mol-color-success, #22c55e)'
    const error = 'var(--mol-color-error, #ef4444)'
    const border = isCorrect
      ? success
      : isWrong
        ? error
        : isSelected
          ? 'currentColor'
          : 'var(--mol-color-border, rgba(128,128,128,0.35))'
    const background = isCorrect
      ? `; background: color-mix(in srgb, ${success} 12%, transparent)`
      : isWrong
        ? `; background: color-mix(in srgb, ${error} 12%, transparent)`
        : ''
    return `border-radius: 8px; border: 1px solid ${border}${background}`
  }
</script>

<Card {className}>
  <div class={cm.stack(4)}>
    <header class={cm.flex({ justify: 'between', align: 'center', gap: 'sm' })}>
      {#if progress}
        <PresentWhileContent tag="span" class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          {#if typeof progress === 'function'}{@render progress?.()}{:else}{progress}{/if}
        </PresentWhileContent>
      {/if}
      {#if timer}
        {#if typeof timer === 'function'}{@render timer?.()}{:else}{timer}{/if}
      {/if}
    </header>
    <h2 class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
      {#if typeof question === 'function'}{@render question?.()}{:else}{question}{/if}
    </h2>
    <div class={cm.stack(2)}>
      {#each options as option (option.id)}
        {@const isSelected = option.id === selected}
        {@const isCorrect = submitted && !!correctId && option.id === correctId}
        {@const isWrong = submitted && !!correctId && isSelected && option.id !== correctId}
        <button
          type="button"
          onclick={() => {
            if (!submitted) selected = option.id
          }}
          disabled={submitted}
          aria-pressed={isSelected}
          data-mol-id="quiz-card-option"
          data-correct={isCorrect ? 'true' : undefined}
          data-wrong={isWrong ? 'true' : undefined}
          class={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.cursorPointer,
            cm.touchTargetCompact,
            isSelected ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
          )}
          style={optionStyle(isCorrect, isWrong, isSelected)}
        >
          <span>
            {#if typeof option.label === 'function'}{@render option.label?.()}{:else}{option.label}{/if}
          </span>
          {#if isCorrect}<span aria-hidden="true">✓</span>{/if}
          {#if isWrong}<span aria-hidden="true">×</span>{/if}
        </button>
      {/each}
    </div>
    {#if !submitted}
      <Button variant="solid" color="primary" onClick={submit} disabled={!selected}>
        {t('quizCard.submit', {}, { defaultValue: 'Submit answer' })}
      </Button>
    {:else if explanation}
      <p class={cm.textSize('sm')}>
        {#if typeof explanation === 'function'}{@render explanation?.()}{:else}{explanation}{/if}
      </p>
    {/if}
  </div>
</Card>
