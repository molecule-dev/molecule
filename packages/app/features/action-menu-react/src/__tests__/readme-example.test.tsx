/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { t } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ActionMenu } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns A row with an action menu that records the last action.
 */
function ProjectRow(): React.JSX.Element {
  const [lastAction, setLastAction] = useState('none')
  return (
    <div>
      <span>{lastAction}</span>
      <ActionMenu
        triggerAriaLabel={t('nav.actions', undefined, { defaultValue: 'Actions' })}
        align="right"
        items={[
          {
            id: 'edit',
            label: t('common.edit', undefined, { defaultValue: 'Edit' }),
            onClick: () => setLastAction('edit'),
          },
          {
            id: 'share',
            label: t('common.share', undefined, { defaultValue: 'Share' }),
            href: '/projects/42/share',
            divider: true,
          },
          {
            id: 'delete',
            label: t('common.delete', undefined, { defaultValue: 'Delete' }),
            onClick: () => setLastAction('delete'),
            destructive: true,
          },
        ]}
      />
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

  it('opens the menu from the trigger and runs the chosen action', () => {
    const view = render(<ProjectRow />)
    const trigger = view.getByRole('button', { name: 'Actions' })
    expect(trigger.getAttribute('data-mol-id')).toBe('action-menu-trigger')
    expect(view.queryByRole('menu')).toBeNull()

    fireEvent.click(trigger)
    const items = view.getAllByRole('menuitem')
    expect(items.map((el) => el.textContent)).toEqual(['Edit', 'Share', 'Delete'])
    expect(items[1]?.getAttribute('href')).toBe('/projects/42/share')

    fireEvent.click(view.getByText('Delete'))
    expect(view.getByText('delete')).toBeTruthy()
    expect(view.queryByRole('menu')).toBeNull()
  })
})
