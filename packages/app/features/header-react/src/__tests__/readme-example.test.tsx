// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import { I18nProvider, useTranslation } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { Button, usePanelClose, UserMenu } from '@molecule/app-ui-react'
import { classMap } from '@molecule/app-ui-tailwind'

import { AppHeader } from '../index.js'

/**
 * The README example's settings panel, verbatim.
 *
 * @returns The panel content.
 */
function SettingsPanel(): React.JSX.Element {
  const { t } = useTranslation()
  const close = usePanelClose()
  return (
    <section>
      <h2>{t('settings.account', undefined, { defaultValue: 'Account' })}</h2>
      <Button onClick={close}>{t('common.close', undefined, { defaultValue: 'Close' })}</Button>
    </section>
  )
}

/**
 * The README example, verbatim.
 *
 * @returns The app header.
 */
function Shell(): React.JSX.Element {
  return (
    <AppHeader
      appName="Bearing"
      userMenu={
        <UserMenu>
          <SettingsPanel />
        </UserMenu>
      }
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    setIconSet(iconSet)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders the brand link and opens / closes the settings panel from the user menu', () => {
    const view = render(
      <MemoryRouter>
        <I18nProvider provider={createSimpleI18nProvider('en')}>
          <Shell />
        </I18nProvider>
      </MemoryRouter>,
    )
    expect(view.getByText('Bearing')).toBeTruthy()
    expect(view.getByRole('link').getAttribute('href')).toBe('/')
    expect(view.container.querySelector('img')?.getAttribute('src')).toBe('/logo.svg')
    expect(view.queryByText('Account')).toBeNull()

    fireEvent.click(view.getByRole('button', { name: 'Open user menu' }))
    expect(view.getByText('Account')).toBeTruthy()

    // The drawer has its own close icon; click the panel's own "Close" button.
    const panelClose = view
      .getAllByRole('button', { name: 'Close' })
      .find((button) => button.textContent === 'Close')
    expect(panelClose).toBeTruthy()
    if (panelClose) fireEvent.click(panelClose)
    expect(view.queryByText('Account')).toBeNull()
  })
})
