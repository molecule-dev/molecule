/**
 * Vue gradebook table — the counterpart of
 * `@molecule/app-gradebook-react`'s `Gradebook`: the same props (React names),
 * the same ClassMap tokens, and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { GpaScale, Grade, GradebookColumn } from './types.js'
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
 * @returns The gradebook component.
 */
export const Gradebook = defineComponent({
  name: 'Gradebook',
  props: {
    grades: { type: Array as PropType<Grade[]>, required: true },
    gpaScale: { type: String as PropType<GpaScale>, required: true },
    onCellClick: {
      type: Function as PropType<(grade: Grade, column: GradebookColumn) => void>,
      default: undefined,
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

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

    return (): VNode => {
      const headTitle = t('gradebook.col.title', {}, { defaultValue: 'Course' })
      const headLetter = t('gradebook.col.letter', {}, { defaultValue: 'Letter' })
      const headNumeric =
        props.gpaScale === 'percentage'
          ? t('gradebook.col.numericPct', {}, { defaultValue: 'Score (%)' })
          : t('gradebook.col.numeric', {}, { defaultValue: 'Score' })
      const headWeight = t('gradebook.col.weight', {}, { defaultValue: 'Weight' })
      const headContribution = t(
        'gradebook.col.contribution',
        {},
        {
          defaultValue: 'GPA contribution',
        },
      )
      const headPosted = t('gradebook.col.posted', {}, { defaultValue: 'Posted' })

      const regionLabel = t('gradebook.aria.region', {}, { defaultValue: 'Gradebook' })
      const emptyText = t('gradebook.empty', {}, { defaultValue: 'No grades yet.' })

      if (props.grades.length === 0) {
        return h(
          'div',
          {
            class: cm.cn(cm.sp('p', 4), props.className),
            'data-mol-id': 'gradebook-empty',
            role: 'region',
            'aria-label': regionLabel,
          },
          [h('span', { class: cm.textSize('sm') }, emptyText)],
        )
      }

      const headerCell = (molId: string, text: string): VNode =>
        h(
          'th',
          {
            scope: 'col',
            class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')),
            'data-mol-id': molId,
          },
          text,
        )

      const cellClass = cm.cn(cm.textSize('sm'))

      const rows: VNode[] = props.grades.map((grade) => {
        const numericText = renderNumericCell(grade)
        const weightText =
          typeof grade.weight === 'number' ? `${Math.round(grade.weight * 100)}%` : '—'
        const contributionText =
          typeof grade.contribution === 'number'
            ? formatGpa(grade.contribution, props.gpaScale)
            : '—'
        return h('tr', { key: grade.id, 'data-mol-id': 'gradebook-row', 'data-row-id': grade.id }, [
          h(
            'td',
            {
              class: cellClass,
              'data-mol-id': 'gradebook-cell-title',
              onClick: handlerFor(grade, 'title'),
            },
            [grade.title as VNodeChild],
          ),
          h(
            'td',
            {
              class: cellClass,
              'data-mol-id': 'gradebook-cell-letter',
              onClick: handlerFor(grade, 'letter'),
            },
            grade.letter ?? '—',
          ),
          h(
            'td',
            {
              class: cellClass,
              'data-mol-id': 'gradebook-cell-numeric',
              onClick: handlerFor(grade, 'numeric'),
            },
            numericText,
          ),
          h(
            'td',
            {
              class: cellClass,
              'data-mol-id': 'gradebook-cell-weight',
              onClick: handlerFor(grade, 'weight'),
            },
            weightText,
          ),
          h(
            'td',
            {
              class: cellClass,
              'data-mol-id': 'gradebook-cell-contribution',
              onClick: handlerFor(grade, 'contribution'),
            },
            contributionText,
          ),
          h(
            'td',
            {
              class: cellClass,
              'data-mol-id': 'gradebook-cell-posted',
              onClick: handlerFor(grade, 'posted'),
            },
            [grade.postedAt ?? '—'],
          ),
        ])
      })

      return h(
        'div',
        {
          role: 'region',
          'aria-label': regionLabel,
          'data-mol-id': 'gradebook',
          class: cm.cn(props.className),
        },
        [
          h('table', { class: cm.cn(cm.w('full')), 'data-mol-id': 'gradebook-table' }, [
            h('thead', {}, [
              h('tr', { 'data-mol-id': 'gradebook-header-row' }, [
                headerCell('gradebook-h-title', headTitle),
                headerCell('gradebook-h-letter', headLetter),
                headerCell('gradebook-h-numeric', headNumeric),
                headerCell('gradebook-h-weight', headWeight),
                headerCell('gradebook-h-contribution', headContribution),
                headerCell('gradebook-h-posted', headPosted),
              ]),
            ]),
            h('tbody', {}, rows),
          ]),
        ],
      )
    }
  },
})
