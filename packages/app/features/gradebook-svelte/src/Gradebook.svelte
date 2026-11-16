<!--
  Gradebook: the Svelte counterpart of `@molecule/app-gradebook-react`'s
  `Gradebook` — unified table of grades (title / letter / numeric / weight /
  contribution-to-GPA / posted), with the empty state and the per-cell click
  callback. Same props (React names), same ClassMap tokens, same DOM for the
  same input. A row's `title` and `postedAt` are snippets, or plain text.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { Grade, GradebookColumn, GradebookProps } from './types.js'
  import { computePercentage, formatGpa } from './utilities.js'

  let { grades, gpaScale, onCellClick, className }: GradebookProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())

  const headTitle = $derived(t('gradebook.col.title', {}, { defaultValue: 'Course' }))
  const headLetter = $derived(t('gradebook.col.letter', {}, { defaultValue: 'Letter' }))
  const headNumeric = $derived(
    gpaScale === 'percentage'
      ? t('gradebook.col.numericPct', {}, { defaultValue: 'Score (%)' })
      : t('gradebook.col.numeric', {}, { defaultValue: 'Score' }),
  )
  const headWeight = $derived(t('gradebook.col.weight', {}, { defaultValue: 'Weight' }))
  const headContribution = $derived(
    t('gradebook.col.contribution', {}, { defaultValue: 'GPA contribution' }),
  )
  const headPosted = $derived(t('gradebook.col.posted', {}, { defaultValue: 'Posted' }))

  const regionLabel = $derived(t('gradebook.aria.region', {}, { defaultValue: 'Gradebook' }))
  const emptyText = $derived(t('gradebook.empty', {}, { defaultValue: 'No grades yet.' }))

  /**
   * Render a numeric percentage / score cell using the configured scale.
   *
   * @param grade - The grade row.
   * @returns The cell text.
   */
  function renderNumericCell(grade: Grade): string {
    if (gpaScale === 'percentage') {
      return `${Math.round(computePercentage(grade))}%`
    }
    if (typeof grade.maxPoints === 'number' && grade.maxPoints > 0) {
      return `${grade.score} / ${grade.maxPoints}`
    }
    return String(grade.score)
  }

  /**
   * Build a cell-click handler when `onCellClick` is provided.
   *
   * @param grade - The grade row.
   * @param column - The column identifier.
   * @returns A click handler or `undefined` when no callback was given.
   */
  function handlerFor(grade: Grade, column: GradebookColumn): (() => void) | undefined {
    if (!onCellClick) return undefined
    return () => onCellClick?.(grade, column)
  }
</script>

{#if grades.length === 0}
  <div
    class={cm.cn(cm.sp('p', 4), className)}
    data-mol-id="gradebook-empty"
    role="region"
    aria-label={regionLabel}
  >
    <span class={cm.textSize('sm')}>{emptyText}</span>
  </div>
{:else}
  <div role="region" aria-label={regionLabel} data-mol-id="gradebook" class={cm.cn(className)}>
    <table class={cm.cn(cm.w('full'))} data-mol-id="gradebook-table">
      <thead>
        <tr data-mol-id="gradebook-header-row">
          <th
            scope="col"
            class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
            data-mol-id="gradebook-h-title">{headTitle}</th
          >
          <th
            scope="col"
            class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
            data-mol-id="gradebook-h-letter">{headLetter}</th
          >
          <th
            scope="col"
            class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
            data-mol-id="gradebook-h-numeric">{headNumeric}</th
          >
          <th
            scope="col"
            class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
            data-mol-id="gradebook-h-weight">{headWeight}</th
          >
          <th
            scope="col"
            class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
            data-mol-id="gradebook-h-contribution">{headContribution}</th
          >
          <th
            scope="col"
            class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
            data-mol-id="gradebook-h-posted">{headPosted}</th
          >
        </tr>
      </thead>
      <tbody>
        {#each grades as grade (grade.id)}
          <tr data-mol-id="gradebook-row" data-row-id={grade.id}>
            <td
              class={cm.cn(cm.textSize('sm'))}
              data-mol-id="gradebook-cell-title"
              onclick={handlerFor(grade, 'title')}
              >{#if typeof grade.title === 'function'}{@render grade.title()}{:else}{grade.title}{/if}</td
            >
            <td
              class={cm.cn(cm.textSize('sm'))}
              data-mol-id="gradebook-cell-letter"
              onclick={handlerFor(grade, 'letter')}>{grade.letter ?? '—'}</td
            >
            <td
              class={cm.cn(cm.textSize('sm'))}
              data-mol-id="gradebook-cell-numeric"
              onclick={handlerFor(grade, 'numeric')}>{renderNumericCell(grade)}</td
            >
            <td
              class={cm.cn(cm.textSize('sm'))}
              data-mol-id="gradebook-cell-weight"
              onclick={handlerFor(grade, 'weight')}
              >{typeof grade.weight === 'number' ? `${Math.round(grade.weight * 100)}%` : '—'}</td
            >
            <td
              class={cm.cn(cm.textSize('sm'))}
              data-mol-id="gradebook-cell-contribution"
              onclick={handlerFor(grade, 'contribution')}
              >{typeof grade.contribution === 'number'
                ? formatGpa(grade.contribution, gpaScale)
                : '—'}</td
            >
            <td
              class={cm.cn(cm.textSize('sm'))}
              data-mol-id="gradebook-cell-posted"
              onclick={handlerFor(grade, 'posted')}
              >{#if typeof grade.postedAt === 'function'}{@render grade.postedAt()}{:else}{grade.postedAt ??
                  '—'}{/if}</td
            >
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
