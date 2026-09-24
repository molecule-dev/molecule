// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider, useTranslation } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'
import { classMap } from '@molecule/app-ui-tailwind'

import { type DefinitionField, InfoCard } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @param props - Component props.
 * @param props.onEdit - Called when the Edit button is clicked.
 * @returns The company details card.
 */
function CompanyDetails({ onEdit }: { onEdit: () => void }): React.JSX.Element {
  const { t } = useTranslation()
  const company = {
    industry: 'Technology',
    founded: new Date(Date.UTC(2018, 2, 14)),
    revenue: 12500000,
  }
  const fields: DefinitionField[] = [
    { label: 'Industry', value: company.industry },
    {
      label: 'Founded',
      value: company.founded.toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' }),
    },
    {
      label: 'Annual revenue',
      value: company.revenue.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
      }),
    },
  ]
  return (
    <InfoCard
      title="Company details"
      fields={fields}
      columns={2}
      actions={
        <Button variant="ghost" size="sm" onClick={onEdit}>
          {t('common.edit', undefined, { defaultValue: 'Edit' })}
        </Button>
      }
      dataMolId="company-info-card"
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders the titled card with formatted label/value pairs and an Edit action', () => {
    const onEdit = vi.fn()
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <CompanyDetails onEdit={onEdit} />
      </I18nProvider>,
    )
    expect(view.getByRole('heading', { name: 'Company details' })).toBeTruthy()
    const terms = Array.from(view.container.querySelectorAll('dt')).map((dt) => dt.textContent)
    const values = Array.from(view.container.querySelectorAll('dd')).map((dd) => dd.textContent)
    expect(terms).toEqual(['Industry', 'Founded', 'Annual revenue'])
    expect(values).toEqual(['Technology', 'Mar 14, 2018', '$13M'])
    expect(view.container.querySelector('[data-mol-id="company-info-card"]')).toBeTruthy()

    fireEvent.click(view.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })
})
