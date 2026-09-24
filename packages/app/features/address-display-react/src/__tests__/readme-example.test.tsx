/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { t } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'
import { classMap } from '@molecule/app-ui-tailwind'

import type { Address } from '../index.js'
import { AddressDisplay } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered shipping address.
 */
function ShippingAddress(): React.JSX.Element {
  const address: Address = {
    line1: '123 Main St',
    line2: 'Apt 4B',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62701',
    country: 'US',
  }
  return (
    <AddressDisplay
      name="Jane Smith"
      address={address}
      phone="+1 555-867-5309"
      actions={
        <Button variant="ghost" size="sm" data-mol-id="shipping-address-edit">
          {t('common.edit', undefined, { defaultValue: 'Edit' })}
        </Button>
      }
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders the name, formatted address lines, tel link and edit action', () => {
    const html = renderToStaticMarkup(<ShippingAddress />)
    expect(html).toContain('Jane Smith')
    expect(html).toContain('<address')
    for (const line of ['123 Main St', 'Apt 4B', 'Springfield, IL 62701', 'US']) {
      expect(html).toContain(`>${line}</span>`)
    }
    expect(html).toContain('href="tel:+1 555-867-5309"')
    expect(html).toMatch(/<button[^>]*data-mol-id="shipping-address-edit"[^>]*>Edit<\/button>/)
  })
})
