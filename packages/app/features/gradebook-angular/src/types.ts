/**
 * Types of `@molecule/app-gradebook-angular` — the Angular counterpart of
 * `@molecule/app-gradebook-react`, with the same prop names and values.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/** A node-valued field (React's `ReactNode`): text, or an `ng-template` reference. */
type GradeNode = TemplateRef<unknown> | string | number

/**
 * GPA scale supported by the gradebook.
 *
 * - `'4.0'` — US-style 4.0 unweighted scale.
 * - `'5.0'` — US-style 5.0 weighted scale (honours / AP).
 * - `'percentage'` — 0–100 percentage rendering (no GPA conversion applied).
 */
export type GpaScale = '4.0' | '5.0' | 'percentage'

/**
 * A single row in the gradebook. Rows can represent either a course
 * (`assignmentTitle` doubles as the course name) or an individual
 * assignment — the caller picks the granularity.
 */
export interface Grade {
  /** Stable identifier (used as the row key). */
  id: string
  /** Course or assignment title shown in the first column: text, or an `ng-template`. */
  title: GradeNode
  /** Letter grade (e.g. `'A-'`, `'B+'`). Optional — derived display only. */
  letter?: string
  /** Numeric score. Interpreted relative to `maxPoints` (or 0–100 when omitted). */
  score: number
  /** Maximum points / denominator for the score. Defaults to 100. */
  maxPoints?: number
  /** Course / assignment weight (0–1) — used to compute the GPA contribution. */
  weight?: number
  /** Pre-computed contribution to overall GPA. Optional — caller may pre-compute. */
  contribution?: number
  /** When the grade was posted. Display-only: text, or an `ng-template`. */
  postedAt?: GradeNode
}

/** Trend direction for the GPA trend chip. */
export type GpaTrend = 'up' | 'down' | 'flat'

/**
 * Props accepted by `GpaCard` — the same props
 * `@molecule/app-gradebook-react` accepts. The node prop `trendLabel` is an
 * input (plain text) or projected content (`[slot=trendLabel]`).
 */
export interface GpaCardProps {
  /** The numeric GPA value (or percentage when `scale='percentage'`). */
  gpa: number
  /** Which scale `gpa` is expressed on. Drives formatting + the "out of" text. */
  scale: GpaScale
  /** Override the maximum value shown in the "out of" caption. */
  max?: number
  /** Optional trend chip — render up/down/flat with localized label. */
  trend?: GpaTrend
  /** Optional caption rendered below the trend: text, or `[slot=trendLabel]` content. */
  trendLabel?: GradeNode
  /** Extra classes merged onto the root element. */
  className?: string
}

/**
 * Props accepted by `Gradebook` — the same props
 * `@molecule/app-gradebook-react` accepts.
 */
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
