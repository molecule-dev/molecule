/** Public types for `@molecule/app-gradebook-react`. */

import type { ReactNode } from 'react'

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
  /** Stable identifier (used as the React key). */
  id: string
  /** Course or assignment title shown in the first column. */
  title: ReactNode
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
  /** When the grade was posted. Display-only. */
  postedAt?: ReactNode
}

/** Trend direction for the GPA trend chip. */
export type GpaTrend = 'up' | 'down' | 'flat'
