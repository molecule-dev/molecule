// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { MedicationRow } from '../index.js'

const medications = [
  {
    id: 'm1',
    name: 'Lisinopril',
    dosage: '10mg',
    form: 'tablet',
    color: '#4ade80',
    instructions: 'Take with water in the morning',
    prescriber: 'Dr. Sarah Chen',
    supplyDays: 14,
    refills: 2,
  },
  {
    id: 'm2',
    name: 'Metformin',
    dosage: '500mg',
    form: 'tablet',
    color: '#f5f5f4',
    instructions: 'Take with dinner',
    prescriber: 'Dr. Sarah Chen',
    supplyDays: 30,
    refills: 5,
  },
]

/**
 * The README example, verbatim.
 *
 * @returns Today's medication list.
 */
function TodaysMedications(): React.JSX.Element {
  const [taken, setTaken] = useState<string[]>([])
  return (
    <div>
      {medications.map(({ id, ...med }) => (
        <MedicationRow
          key={id}
          {...med}
          actions={
            <button
              type="button"
              disabled={taken.includes(id)}
              onClick={() => setTaken((ids) => [...ids, id])}
            >
              {taken.includes(id) ? 'Taken' : 'Mark taken'}
            </button>
          }
        />
      ))}
    </div>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders each medication with its details and marks one as taken', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <TodaysMedications />
      </I18nProvider>,
    )
    expect(view.getByRole('heading', { name: 'Lisinopril' })).toBeTruthy()
    expect(view.getByText('500mg')).toBeTruthy()
    expect(view.getByText('Take with water in the morning')).toBeTruthy()
    expect(view.getAllByText(/Prescribed by Dr\. Sarah Chen/)).toHaveLength(2)
    expect(view.getByText(/14 day supply/)).toBeTruthy()
    expect(view.getByText(/5 refills/)).toBeTruthy()

    const buttons = view.getAllByRole('button', { name: 'Mark taken' })
    expect(buttons).toHaveLength(2)
    const first = buttons[0]
    if (!first) throw new Error('missing button')
    fireEvent.click(first)
    const takenButton = view.getByRole('button', { name: 'Taken' }) as HTMLButtonElement
    expect(takenButton.disabled).toBe(true)
    expect(view.getAllByRole('button', { name: 'Mark taken' })).toHaveLength(1)
  })
})
