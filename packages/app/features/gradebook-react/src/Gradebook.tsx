import type { JSX } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { GpaScale, Grade } from './types.js'
import { computePercentage, formatGpa } from './utilities.js'

/** Props for {@link Gradebook}. */
export interface GradebookProps {
  /** Rows to display. Each row may represent a course or an assignment — caller's choice. */
  grades: Grade[]
  /** GPA scale used for numeric rendering of contribution / score columns. */
  gpaScale: GpaScale
  /** Optional cell-click handler — fires with the grade row + the column key clicked. */
  onCellClick?: (grade: Grade, column: GradebookColumn) => void
  /** Extra classes merged onto the root `<table>` wrapper. */
  className?: string
}

/** Column identifiers exposed via `onCellClick`. */
export type GradebookColumn = 'title' | 'letter' | 'numeric' | 'weight' | 'contribution' | 'posted'

/**
 * Unified gradebook table — title, letter grade, numeric score, weight, and
 * contribution-to-GPA. Rows can be either courses or assignments; the caller
 * decides which granularity to pass.
 *
 * Pairs with {@link GpaCard} for the hero summary. Styling routes through
 * `getClassMap()`; all visible text routes through `t()` via the companion
 * `@molecule/app-locales-gradebook` locale bond.
 *
 * @param props - Component props.
 * @returns The gradebook element.
 */
export function Gradebook(props: GradebookProps): JSX.Element {
  const { grades, gpaScale, onCellClick, className } = props
  const cm = getClassMap()
  const { t } = useTranslation()

  const headTitle = t('gradebook.col.title', {}, { defaultValue: 'Course' })
  const headLetter = t('gradebook.col.letter', {}, { defaultValue: 'Letter' })
  const headNumeric =
    gpaScale === 'percentage'
      ? t('gradebook.col.numericPct', {}, { defaultValue: 'Score (%)' })
      : t('gradebook.col.numeric', {}, { defaultValue: 'Score' })
  const headWeight = t('gradebook.col.weight', {}, { defaultValue: 'Weight' })
  const headContribution = t('gradebook.col.contribution', {}, { defaultValue: 'GPA contribution' })
  const headPosted = t('gradebook.col.posted', {}, { defaultValue: 'Posted' })

  const regionLabel = t('gradebook.aria.region', {}, { defaultValue: 'Gradebook' })
  const emptyText = t('gradebook.empty', {}, { defaultValue: 'No grades yet.' })

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
    return () => onCellClick(grade, column)
  }

  if (grades.length === 0) {
    return (
      <div
        className={cm.cn(cm.sp('p', 4), className)}
        data-mol-id="gradebook-empty"
        role="region"
        aria-label={regionLabel}
      >
        <span className={cm.textSize('sm')}>{emptyText}</span>
      </div>
    )
  }

  return (
    <div
      role="region"
      aria-label={regionLabel}
      data-mol-id="gradebook"
      className={cm.cn(className)}
    >
      <table className={cm.cn(cm.w('full'))} data-mol-id="gradebook-table">
        <thead>
          <tr data-mol-id="gradebook-header-row">
            <th
              scope="col"
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
              data-mol-id="gradebook-h-title"
            >
              {headTitle}
            </th>
            <th
              scope="col"
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
              data-mol-id="gradebook-h-letter"
            >
              {headLetter}
            </th>
            <th
              scope="col"
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
              data-mol-id="gradebook-h-numeric"
            >
              {headNumeric}
            </th>
            <th
              scope="col"
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
              data-mol-id="gradebook-h-weight"
            >
              {headWeight}
            </th>
            <th
              scope="col"
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
              data-mol-id="gradebook-h-contribution"
            >
              {headContribution}
            </th>
            <th
              scope="col"
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
              data-mol-id="gradebook-h-posted"
            >
              {headPosted}
            </th>
          </tr>
        </thead>
        <tbody>
          {grades.map((grade) => {
            const numericText = renderNumericCell(grade)
            const weightText =
              typeof grade.weight === 'number' ? `${Math.round(grade.weight * 100)}%` : '—'
            const contributionText =
              typeof grade.contribution === 'number' ? formatGpa(grade.contribution, gpaScale) : '—'
            const cellClass = cm.cn(cm.textSize('sm'))
            return (
              <tr key={grade.id} data-mol-id="gradebook-row" data-row-id={grade.id}>
                <td
                  className={cellClass}
                  data-mol-id="gradebook-cell-title"
                  onClick={handlerFor(grade, 'title')}
                >
                  {grade.title}
                </td>
                <td
                  className={cellClass}
                  data-mol-id="gradebook-cell-letter"
                  onClick={handlerFor(grade, 'letter')}
                >
                  {grade.letter ?? '—'}
                </td>
                <td
                  className={cellClass}
                  data-mol-id="gradebook-cell-numeric"
                  onClick={handlerFor(grade, 'numeric')}
                >
                  {numericText}
                </td>
                <td
                  className={cellClass}
                  data-mol-id="gradebook-cell-weight"
                  onClick={handlerFor(grade, 'weight')}
                >
                  {weightText}
                </td>
                <td
                  className={cellClass}
                  data-mol-id="gradebook-cell-contribution"
                  onClick={handlerFor(grade, 'contribution')}
                >
                  {contributionText}
                </td>
                <td
                  className={cellClass}
                  data-mol-id="gradebook-cell-posted"
                  onClick={handlerFor(grade, 'posted')}
                >
                  {grade.postedAt ?? '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
