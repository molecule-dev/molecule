/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import type { DateRange } from '@molecule/app-date-range-picker'
import { requireProvider, setProvider } from '@molecule/app-date-range-picker'

import { createProvider } from '../index.js'

describe('README @example', () => {
  it('bonds the provider and reports clamped ranges through onChange', () => {
    setProvider(createProvider())

    let reportRange: DateRange | null = null
    const picker = requireProvider().createPicker({
      startDate: new Date(2026, 8, 1),
      endDate: new Date(2026, 8, 7),
      maxDate: new Date(2026, 8, 24),
      onChange: (range) => {
        reportRange = range
      },
    })

    expect(picker.getValue()).toEqual({
      startDate: new Date(2026, 8, 1),
      endDate: new Date(2026, 8, 7),
    })

    picker.setValue({ startDate: new Date(2026, 8, 10), endDate: new Date(2026, 9, 1) })
    expect(reportRange).toEqual({
      startDate: new Date(2026, 8, 10),
      endDate: new Date(2026, 8, 24),
    })

    picker.destroy()
    expect(picker.getValue()).toBeNull()
  })
})
