// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: real ClassMap and real i18n provider.
 *
 * @module
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { type JSX, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { getProvider as getI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { Checklist } from '../index.js'

setClassMap(classMap)

/**
 * The README example, verbatim.
 *
 * @returns The onboarding checklist.
 */
function Onboarding(): JSX.Element {
  const [items, setItems] = useState([
    { id: 'profile', label: 'Complete your profile', completed: true },
    { id: 'invite', label: 'Invite a team member', completed: false },
    { id: 'project', label: 'Create your first project', completed: false },
  ])
  return (
    <I18nProvider provider={getI18nProvider()}>
      <Checklist
        title="Getting started"
        items={items}
        onToggle={(id, next) =>
          setItems((list) =>
            list.map((item) => (item.id === id ? { ...item, completed: next } : item)),
          )
        }
      />
    </I18nProvider>
  )
}

describe('README @example', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows progress and updates it when an item is checked', () => {
    render(<Onboarding />)

    expect(screen.getByRole('heading', { name: 'Getting started' })).toBeTruthy()
    expect(screen.getByText('1 of 3 complete')).toBeTruthy()
    expect(screen.getByText('33%')).toBeTruthy()
    expect((screen.getByLabelText('Complete your profile') as HTMLInputElement).checked).toBe(true)

    const invite = screen.getByLabelText('Invite a team member') as HTMLInputElement
    expect(invite.checked).toBe(false)
    fireEvent.click(invite)

    expect((screen.getByLabelText('Invite a team member') as HTMLInputElement).checked).toBe(true)
    expect(screen.getByText('2 of 3 complete')).toBeTruthy()
    expect(screen.getByText('67%')).toBeTruthy()
  })
})
