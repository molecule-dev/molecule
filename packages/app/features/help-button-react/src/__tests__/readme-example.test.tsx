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
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import { I18nProvider, useTranslation } from '@molecule/app-react'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-react'
import { classMap } from '@molecule/app-ui-tailwind'

import { HelpButton } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The floating help button and its help modal.
 */
function SupportLauncher(): React.JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(false)
  return (
    <>
      <HelpButton
        position="bottom-right"
        hasNotification={!seen}
        className={cm.cn(cm.surface, cm.shadowLifted)}
        onClick={() => {
          setOpen(true)
          setSeen(true)
        }}
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('helpButton.label', undefined, { defaultValue: 'Help' })}
      >
        <a href="https://docs.example.com">docs.example.com</a>
      </Modal>
    </>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    setIconSet(iconSet) // the Modal's close icon throws without it
  })
  afterEach(() => {
    cleanup()
  })

  it('shows a fixed help button with a notification dot, then opens the help modal on click', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <SupportLauncher />
      </I18nProvider>,
    )
    const button = view.getByRole('button', { name: 'Help' })
    expect(button.style.position).toBe('fixed')
    expect(button.className).toBe(classMap.cn(classMap.surface, classMap.shadowLifted))
    expect(button.querySelectorAll('span[aria-hidden]')).toHaveLength(2)
    expect(view.queryByRole('link')).toBeNull()

    fireEvent.click(button)
    expect(view.getByRole('link').getAttribute('href')).toBe('https://docs.example.com')
    expect(button.querySelectorAll('span[aria-hidden]')).toHaveLength(1)
  })
})
