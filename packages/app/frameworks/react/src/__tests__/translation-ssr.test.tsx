// @vitest-environment node
import { renderToString } from 'react-dom/server'
import { expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'

import { useTranslation } from '../hooks/useTranslation.js'
import { I18nProvider } from '../providers.js'

// React 18 warns when a server render requests a layout effect. Reject that call on
// the current test runtime as well so the test covers both supported React majors.
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useLayoutEffect: () => {
    throw new Error('A server render requested a layout effect')
  },
}))

it('renders translated text on a Node server without requesting a layout effect', () => {
  function LocalizedHeading(): React.ReactElement {
    const { t } = useTranslation()
    return <h2>{t('sample.dialog', {}, { defaultValue: 'Dialog heading' })}</h2>
  }

  expect(typeof window).toBe('undefined')
  expect(
    renderToString(
      <I18nProvider provider={createSimpleI18nProvider()}>
        <LocalizedHeading />
      </I18nProvider>,
    ),
  ).toBe('<h2>Dialog heading</h2>')
})
