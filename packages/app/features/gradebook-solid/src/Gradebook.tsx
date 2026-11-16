/**
 * Solid gradebook table — the counterpart of
 * `@molecule/app-gradebook-react`'s `Gradebook`: the same props (React names),
 * the same ClassMap tokens, and the same DOM for the same input.
 *
 * @module
 */

import { type Component, For, type JSX, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { Grade, GradebookColumn, GradebookProps } from './types.js'
import { computePercentage, formatGpa } from './utilities.js'

/**
 * Unified gradebook table — title, letter grade, numeric score, weight, and
 * contribution-to-GPA. Rows can be either courses or assignments; the caller
 * decides which granularity to pass.
 *
 * Pairs with `GpaCard` for the hero summary. Styling routes through
 * `getClassMap()`; all visible text routes through `t()` via the companion
 * `@molecule/app-locales-gradebook` locale bond.
 *
 * @param props - Component props (see {@link GradebookProps}).
 * @returns The rendered gradebook.
 */
export const Gradebook: Component<GradebookProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const headTitle = (): string => t('gradebook.col.title', {}, { defaultValue: 'Course' })
  const headLetter = (): string => t('gradebook.col.letter', {}, { defaultValue: 'Letter' })
  const headNumeric = (): string =>
    props.gpaScale === 'percentage'
      ? t('gradebook.col.numericPct', {}, { defaultValue: 'Score (%)' })
      : t('gradebook.col.numeric', {}, { defaultValue: 'Score' })
  const headWeight = (): string => t('gradebook.col.weight', {}, { defaultValue: 'Weight' })
  const headContribution = (): string =>
    t('gradebook.col.contribution', {}, { defaultValue: 'GPA contribution' })
  const headPosted = (): string => t('gradebook.col.posted', {}, { defaultValue: 'Posted' })

  const regionLabel = (): string => t('gradebook.aria.region', {}, { defaultValue: 'Gradebook' })
  const emptyText = (): string => t('gradebook.empty', {}, { defaultValue: 'No grades yet.' })

  /**
   * Render a numeric percentage / score cell using the configured scale.
   *
   * @param grade - The grade row.
   * @returns The cell text.
   */
  function renderNumericCell(grade: Grade): string {
    if (props.gpaScale === 'percentage') {
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
    if (!props.onCellClick) return undefined
    return () => props.onCellClick?.(grade, column)
  }

  const headerCell = (molId: string, text: string): JSX.Element => (
    <th scope="col" class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))} data-mol-id={molId}>
      {text}
    </th>
  )

  return (
    <Show
      when={props.grades.length > 0}
      fallback={
        <div
          class={cm.cn(cm.sp('p', 4), props.className)}
          data-mol-id="gradebook-empty"
          role="region"
          aria-label={regionLabel()}
        >
          <span class={cm.textSize('sm')}>{emptyText()}</span>
        </div>
      }
    >
      <div
        role="region"
        aria-label={regionLabel()}
        data-mol-id="gradebook"
        class={cm.cn(props.className)}
      >
        <table class={cm.cn(cm.w('full'))} data-mol-id="gradebook-table">
          <thead>
            <tr data-mol-id="gradebook-header-row">
              {headerCell('gradebook-h-title', headTitle())}
              {headerCell('gradebook-h-letter', headLetter())}
              {headerCell('gradebook-h-numeric', headNumeric())}
              {headerCell('gradebook-h-weight', headWeight())}
              {headerCell('gradebook-h-contribution', headContribution())}
              {headerCell('gradebook-h-posted', headPosted())}
            </tr>
          </thead>
          <tbody>
            <For each={props.grades}>
              {(grade) => (
                <tr data-mol-id="gradebook-row" data-row-id={grade.id}>
                  <td
                    class={cm.cn(cm.textSize('sm'))}
                    data-mol-id="gradebook-cell-title"
                    onClick={handlerFor(grade, 'title')}
                  >
                    {grade.title}
                  </td>
                  <td
                    class={cm.cn(cm.textSize('sm'))}
                    data-mol-id="gradebook-cell-letter"
                    onClick={handlerFor(grade, 'letter')}
                  >
                    {grade.letter ?? '—'}
                  </td>
                  <td
                    class={cm.cn(cm.textSize('sm'))}
                    data-mol-id="gradebook-cell-numeric"
                    onClick={handlerFor(grade, 'numeric')}
                  >
                    {renderNumericCell(grade)}
                  </td>
                  <td
                    class={cm.cn(cm.textSize('sm'))}
                    data-mol-id="gradebook-cell-weight"
                    onClick={handlerFor(grade, 'weight')}
                  >
                    {typeof grade.weight === 'number' ? `${Math.round(grade.weight * 100)}%` : '—'}
                  </td>
                  <td
                    class={cm.cn(cm.textSize('sm'))}
                    data-mol-id="gradebook-cell-contribution"
                    onClick={handlerFor(grade, 'contribution')}
                  >
                    {typeof grade.contribution === 'number'
                      ? formatGpa(grade.contribution, props.gpaScale)
                      : '—'}
                  </td>
                  <td
                    class={cm.cn(cm.textSize('sm'))}
                    data-mol-id="gradebook-cell-posted"
                    onClick={handlerFor(grade, 'posted')}
                  >
                    {grade.postedAt ?? '—'}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </Show>
  )
}
