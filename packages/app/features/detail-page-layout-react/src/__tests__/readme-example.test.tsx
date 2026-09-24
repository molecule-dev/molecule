/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { Breadcrumb } from '@molecule/app-breadcrumb-react'
import { DetailHeader } from '@molecule/app-detail-header-react'
import { t } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { DetailPageLayout } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered invoice detail page.
 */
function InvoiceDetailPage(): React.JSX.Element {
  const invoice = {
    number: 'INV-1042',
    customer: 'Acme Corp',
    lines: [
      { id: 'l1', description: 'Design sprint', amount: '$4,800.00' },
      { id: 'l2', description: 'Hosting (June)', amount: '$120.00' },
    ],
    notes: 'Net 30. Thank you for your business.',
  }
  return (
    <DetailPageLayout
      breadcrumb={
        <Breadcrumb
          items={[
            {
              label: t('nav.invoices', undefined, { defaultValue: 'Invoices' }),
              to: '/invoices',
            },
            { label: invoice.number },
          ]}
        />
      }
      topBar={<DetailHeader title={invoice.number} subtitle={invoice.customer} />}
      main={invoice.lines.map((line) => (
        <p key={line.id}>
          {line.description} — {line.amount}
        </p>
      ))}
      sidebar={
        <section>
          <h2>{t('form.notes', undefined, { defaultValue: 'Notes' })}</h2>
          <p>{invoice.notes}</p>
        </section>
      }
      sidebarPosition="right"
      sidebarWidth="md"
      dataMolId="invoice-detail"
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('stacks breadcrumb, header, main column and a 320px right sidebar in order', () => {
    const html = renderToStaticMarkup(<InvoiceDetailPage />)
    expect(html).toMatch(/^<div data-mol-id="invoice-detail"/)
    expect(html).toContain('<a href="/invoices"')
    expect(html).toContain('<span aria-current="page">')
    expect(html).toMatch(/<h1[^>]*>INV-1042<\/h1>/)
    expect(html).toContain('<p>Design sprint — $4,800.00</p>')
    expect(html).toContain('<aside style="flex-basis:320px;flex-shrink:0">')
    const order = ['aria-label="Breadcrumb"', '<header', '<main', '<aside'].map((s) =>
      html.indexOf(s),
    )
    expect(order.every((i) => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(html).toContain('Net 30. Thank you for your business.')
  })
})
