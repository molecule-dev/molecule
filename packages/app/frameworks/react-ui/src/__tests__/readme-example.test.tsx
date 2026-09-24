// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — with the REAL Tailwind ClassMap and
 * the REAL molecule icon set bonded, no mocks.
 *
 * @module
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { type JSX, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { registerLocaleModule, t } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import * as commonLocales from '@molecule/app-locales-common'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { Alert, Button, Icon, Modal } from '../index.js'

setClassMap(classMap)
setIconSet(iconSet)
registerLocaleModule(commonLocales)

/**
 * The example's component.
 *
 * @returns The delete button + confirmation modal, or the success alert.
 */
function DeleteAccountButton(): JSX.Element {
  const [open, setOpen] = useState(false)
  const [deleted, setDeleted] = useState(false)

  if (deleted) {
    return (
      <Alert status="success">
        {t('common.completed', undefined, { defaultValue: 'Completed' })}
      </Alert>
    )
  }
  return (
    <>
      <Button
        color="error"
        leftIcon={<Icon name="trash" size={16} />}
        onClick={() => setOpen(true)}
      >
        {t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' })}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('settings.deleteAccountModal.title', undefined, {
          defaultValue: 'Delete Account',
        })}
      >
        <Button color="error" data-mol-id="confirm-delete-account" onClick={() => setDeleted(true)}>
          {t('common.delete', undefined, { defaultValue: 'Delete' })}
        </Button>
      </Modal>
    </>
  )
}

describe('README @example', () => {
  afterEach(() => {
    cleanup()
  })

  it('opens the confirmation modal and shows the success alert after confirming', () => {
    render(<DeleteAccountButton />)

    const trigger = screen.getByRole('button', { name: 'Delete account' })
    expect(trigger.querySelector('svg')).not.toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('Delete Account')

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('alert').textContent).toContain('Completed')
  })
})
