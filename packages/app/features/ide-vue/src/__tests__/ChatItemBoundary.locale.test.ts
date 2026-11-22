// @vitest-environment jsdom
/**
 * Locale test for the Vue `ChatItemBoundary`: after a language switch the
 * failed item's inline notice is in the new language. The conformance kit
 * cannot record the errored branch (React logs every caught render error and
 * the kit refuses recording cases whose React reference logs), so this
 * property is pinned here, the way `RootErrorBoundary`'s locale test is.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type * as AppLogger from '@molecule/app-logger'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

// The real i18n provider logs through the same package, so only the boundary's report is stubbed.
vi.mock('@molecule/app-logger', async (importOriginal) => ({
  ...(await importOriginal<typeof AppLogger>()),
  error: vi.fn(),
}))

const { ChatItemBoundary } = await import('../parts/ChatItemBoundary.js')

/** A child that fails to render, so the boundary shows its notice. */
const Broken = defineComponent({
  name: 'Broken',
  setup(): never {
    throw new Error('render failed')
  },
})

const mounted: (() => void)[] = []
afterEach(() => {
  for (const unmount of mounted.splice(0)) unmount()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('ChatItemBoundary after a language switch', () => {
  it('shows the failed item notice in the new language', async () => {
    // Vue reports the caught render error on the console; the boundary is the subject here.
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
    const app = createApp({
      render: () => h(ChatItemBoundary, { render: () => h(Broken) }),
    })
    mounted.push(() => {
      app.unmount()
      container.remove()
    })
    app.mount(container)
    await nextTick()
    expect(container.querySelector('[data-mol-id="chat-item-render-error"]')?.textContent).toBe(
      "This message couldn't be displayed.",
    )

    await provider.setLocale('fr')
    await nextTick()

    expect(container.querySelector('[data-mol-id="chat-item-render-error"]')?.textContent).toBe(
      "Ce message n'a pas pu être affiché.",
    )
  })
})
