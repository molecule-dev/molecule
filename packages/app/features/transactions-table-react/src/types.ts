/**
 * Types for the transactions table.
 *
 * @module
 */

import type { ReactNode } from 'react'

/** Per-row data. Stays minimal so the consumer can fold their domain shape in. */
export interface TransactionRowData {
  id: string
  date: string | Date
  description: ReactNode
  /** Category key (used for the icon + chip styling lookup). */
  categoryKey: string
  categoryLabel: ReactNode
  /** Account name / id rendered in the Account column. */
  account: ReactNode
  /** Signed amount (positive = income, negative = expense) — used for the colour + sign. */
  amount: number
  /** Override sign detection (e.g. when `type` is the canonical signal). */
  isIncome?: boolean
}

/** Visual treatment for a particular category key. */
export interface CategoryStyle {
  bg: string
  color: string
  icon: string
}
