// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AppFooter } from '../AppFooter.js'

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useVersion: () => ({ state: { version: '1.0.0' } }),
}))

vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Modal: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? children : null),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('renders the rich footer modal through React elements without assigning innerHTML', () => {
  setClassMap(classMap)
  const i18n = createSimpleI18nProvider()
  i18n.addTranslations('en', {
    'content.privacyPolicy': '<ul>\n<li><strong>{{appName}}</strong></li>\n</ul>',
  })
  const innerHTML = vi.spyOn(Element.prototype, 'innerHTML', 'set')
  const { container, getByRole } = render(
    <I18nProvider provider={i18n}>
      <AppFooter appName="<b>A&B</b>" aboutHref="https://example.com/about" />
    </I18nProvider>,
  )

  fireEvent.click(getByRole('button', { name: 'Privacy Policy' }))

  expect(container.querySelector('ul > li > strong')?.textContent).toBe('<b>A&B</b>')
  expect(container.querySelector('ul')?.firstChild?.textContent).toBe('\n')
  expect(container.querySelector('b')).toBeNull()
  expect(innerHTML).not.toHaveBeenCalled()

  const prose = container.querySelector('ul')?.parentElement
  act(() => i18n.addTranslations('en', { 'content.privacyPolicy': '&nbsp;' }))
  expect(prose?.textContent).toBe('\u00a0')
})
