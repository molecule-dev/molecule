// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { del } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import { I18nProvider, useTranslation } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ConfirmDialog, DangerZoneSection } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered delete-account section.
 */
function DeleteAccountSection(): React.JSX.Element {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Deletes the account through the HTTP client. */
  async function deleteAccount(): Promise<void> {
    setBusy(true)
    try {
      await del('/account')
      setOpen(false)
    } catch (_err) {
      // The failure is surfaced to the user via `error` state below.
      setError(
        t('settings.failedToDeleteAccount', undefined, {
          defaultValue: 'Failed to delete account.',
        }),
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <DangerZoneSection
        title={t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' })}
        description="This permanently removes your account and all data."
        actionLabel={t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' })}
        onAction={() => setOpen(true)}
        dataMolId="delete-account"
      />
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('settings.deleteAccountModal.title', undefined, {
          defaultValue: 'Delete Account',
        })}
        description="This action cannot be undone."
        confirmLabel={t('common.delete', undefined, { defaultValue: 'Delete' })}
        onConfirm={deleteAccount}
        loading={busy}
      >
        {error && <p role="alert">{error}</p>}
      </ConfirmDialog>
    </>
  )
}

/**
 * Renders the example inside the i18n provider and opens the confirm dialog.
 *
 * @returns The testing-library render result.
 */
function renderAndOpen(): ReturnType<typeof render> {
  const view = render(
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <DeleteAccountSection />
    </I18nProvider>,
  )
  expect(view.queryByText('This action cannot be undone.')).toBeNull()
  fireEvent.click(view.getByRole('button', { name: 'Delete account' }))
  expect(view.getByText('This action cannot be undone.')).toBeTruthy()
  return view
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    setIconSet(iconSet) // the Modal's close icon throws without it
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('opens the dialog, sends DELETE on confirm and closes when it succeeds', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(''))
    vi.stubGlobal('fetch', fetchMock)
    const view = renderAndOpen()
    expect(view.getByText('This permanently removes your account and all data.')).toBeTruthy()
    expect(view.getByText('Delete Account')).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(view.queryByText('This action cannot be undone.')).toBeNull())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/account')
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('DELETE')
  })

  it('keeps the dialog open and shows the error when the API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    )
    const view = renderAndOpen()
    fireEvent.click(view.getByRole('button', { name: 'Delete' }))
    await waitFor(() =>
      expect(view.getByRole('alert').textContent).toBe('Failed to delete account.'),
    )
    expect(view.getByRole('button', { name: 'Cancel' })).toBeTruthy()
  })
})
