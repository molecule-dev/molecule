// @vitest-environment jsdom
/**
 * Locale test for the Solid `ChatItemBoundary`: after a language switch the
 * failed item's inline notice is in the new language. The conformance kit
 * cannot record the errored branch (React logs every caught render error and
 * the kit refuses recording cases whose React reference logs), so this
 * property is pinned here, the way `RootErrorBoundary`'s locale test is.
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type * as AppLogger from '@molecule/app-logger'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

// The real i18n provider logs through the same package, so only the boundary's report is stubbed.
vi.mock('@molecule/app-logger', async (importOriginal) => ({
  ...(await importOriginal<typeof AppLogger>()),
  error: vi.fn(),
}))

const { ChatItemBoundary } = await import('../parts/ChatItemBoundary.jsx')

/** A child that fails to render, so the boundary shows its notice. */
function Broken(): never {
  throw new Error('render failed')
}

const disposers: Array<() => void> = []
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('ChatItemBoundary after a language switch', () => {
  it('shows the failed item notice in the new language', async () => {
    // Solid reports the caught render error on the console; the boundary is the subject here.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    setClassMap(classMap)
    const provider = createSimpleI18nProvider('en', [
      {
        code: 'en',
        name: 'English',
        translations: { 'ide.chat.itemRenderError': "This message couldn't be displayed." },
      },
      {
        code: 'fr',
        name: 'Français',
        translations: { 'ide.chat.itemRenderError': "Ce message n'a pas pu être affiché." },
      },
    ])
    setProvider(provider)
    const container = document.createElement('div')
    document.body.append(container)
    disposers.push(render(() => <ChatItemBoundary render={() => <Broken />} />, container))
    expect(container.querySelector('[data-mol-id="chat-item-render-error"]')?.textContent).toBe(
      "This message couldn't be displayed.",
    )

    await provider.setLocale('fr')

    expect(container.querySelector('[data-mol-id="chat-item-render-error"]')?.textContent).toBe(
      "Ce message n'a pas pu être affiché.",
    )
  })
})
