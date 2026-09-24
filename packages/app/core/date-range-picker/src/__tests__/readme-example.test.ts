/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the default bond.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { provider } from '@molecule/app-date-range-picker-default'
import { t } from '@molecule/app-i18n'

import type { DatePreset, DateRange } from '../index.js'
import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  it('applies a preset through setValue, fires onChange, and yields ISO bounds', () => {
    setProvider(provider)

    const DAY_MS = 86_400_000
    const today = new Date()
    const daysAgo = (n: number): Date => new Date(today.getTime() - n * DAY_MS)
    const last30: DatePreset = {
      label: t('dates.last30', undefined, { defaultValue: 'Last 30 days' }),
      range: { startDate: daysAgo(30), endDate: today },
    }
    expect(last30.label).toBe('Last 30 days')

    let reportRange: DateRange | null = null
    const picker = requireProvider().createPicker({
      startDate: daysAgo(7),
      endDate: today,
      maxDate: today,
      presets: [last30],
      onChange: (range) => {
        reportRange = range
      },
    })
    expect(picker.getValue()?.startDate.getTime()).toBe(daysAgo(7).getTime())
    expect(reportRange).toBeNull()

    const onPresetClick = (preset: DatePreset): void => picker.setValue(preset.range)
    onPresetClick(last30)
    const selected = picker.getValue()
    const query = { from: selected?.startDate.toISOString(), to: selected?.endDate.toISOString() }

    expect(reportRange).toEqual({ startDate: daysAgo(30), endDate: today })
    expect(query).toEqual({ from: daysAgo(30).toISOString(), to: today.toISOString() })

    picker.setValue({ startDate: daysAgo(1), endDate: new Date(today.getTime() + 5 * DAY_MS) })
    expect(picker.getValue()?.endDate.getTime()).toBe(today.getTime())
  })
})
