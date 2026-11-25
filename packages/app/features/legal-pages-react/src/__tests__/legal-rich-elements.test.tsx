// @vitest-environment jsdom
import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { LegalContentPage } from '../LegalContentPage.js'
import { LegalModalLinks } from '../LegalModalLinks.js'

vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Modal: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? children : null),
}))

const appName = '<b>A&B</b>'
const key = 'content.privacyPolicy'

beforeEach(() => {
  setClassMap(classMap)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function assertRendered(
  container: HTMLElement,
  content: ReactNode,
  openModal = false,
): Promise<void> {
  const i18n = createSimpleI18nProvider()
  i18n.addTranslations('en', {
    [key]: '<h2>Privacy</h2>\n<p>For <strong>{{appName}}</strong>.</p>',
  })
  const innerHTML = vi.spyOn(Element.prototype, 'innerHTML', 'set')
  const root = createRoot(container)
  try {
    await act(async () => root.render(<I18nProvider provider={i18n}>{content}</I18nProvider>))
    if (openModal) {
      const button = container.querySelector('button')
      if (!button) throw new Error('Privacy trigger did not render')
      await act(async () => button.click())
    }
    expect(container.querySelector('h2 + p > strong')?.textContent).toBe(appName)
    expect(container.querySelector('h2')?.nextSibling?.textContent).toBe('\n')
    expect(container.querySelector('b')).toBeNull()
    expect(innerHTML).not.toHaveBeenCalled()
    if (!openModal) {
      const prose = container.querySelector('h2')?.parentElement
      await act(async () => {
        i18n.addTranslations('en', { [key]: '<p><em title="{{appName}}">{{appName}}</em></p>' })
      })
      const custom = container.querySelector('p > em')
      expect(custom?.textContent).toBe(appName)
      expect(custom?.getAttribute('title')).toBe('{{appName}}')
      expect(custom?.parentElement?.parentElement).toBe(prose)
      expect(innerHTML).toHaveBeenCalledTimes(1)
    }
  } finally {
    await act(async () => root.unmount())
  }
}

describe('React legal elements', () => {
  it('renders the rich page through React elements without assigning innerHTML', async () => {
    await assertRendered(
      document.createElement('div'),
      <LegalContentPage kind="privacy" appName={appName} />,
    )
  })

  it('renders the rich modal through React elements without assigning innerHTML', async () => {
    await assertRendered(
      document.createElement('div'),
      <LegalModalLinks appName={appName} show="privacy" />,
      true,
    )
  })
})
