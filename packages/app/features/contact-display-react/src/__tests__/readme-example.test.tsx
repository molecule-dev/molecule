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

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ContactDisplay, type ContactFields } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered team list.
 */
function TeamList(): React.JSX.Element {
  const team: Array<ContactFields & { id: string }> = [
    {
      id: 'jane',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1 555 0100',
      role: 'Product Designer',
      company: 'Acme Corp',
    },
    {
      id: 'omar',
      name: 'Omar Haddad',
      email: 'omar@example.com',
      role: 'Engineer',
      address: '12 Market St, Springfield',
    },
  ]
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <div>
      {team.map(({ id, ...contact }) => (
        <ContactDisplay key={id} contact={contact} layout="row" onClick={() => setOpenId(id)} />
      ))}
      <p>{openId}</p>
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

  it('renders each contact with mailto/tel links, role, company and address', () => {
    const view = render(<TeamList />)
    expect(view.getByText('Jane Smith')).toBeTruthy()
    expect(view.getByText('Product Designer')).toBeTruthy()
    expect(view.getByText('Acme Corp')).toBeTruthy()
    expect(view.getByRole('link', { name: 'jane@example.com' }).getAttribute('href')).toBe(
      'mailto:jane@example.com',
    )
    expect(view.getByRole('link', { name: '+1 555 0100' }).getAttribute('href')).toBe(
      'tel:+1 555 0100',
    )
    expect(view.getByText('12 Market St, Springfield')).toBeTruthy()
    expect(view.getByText('OH')).toBeTruthy()
  })

  it('reports which contact was clicked', () => {
    const view = render(<TeamList />)
    fireEvent.click(view.getByText('Omar Haddad'))
    expect(view.container.querySelector('p')?.textContent).toBe('omar')
  })
})
