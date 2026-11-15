// @vitest-environment jsdom
/**
 * Locale test for the Vue `RootErrorBoundary` — a port of
 * `@molecule/app-root-error-boundary-react/src/__tests__/root-error-boundary-locale.test.tsx`:
 * after a language switch the errored boundary's recovery message is in the
 * new language.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type * as AppLogger from '@molecule/app-logger'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_target, prop) =>
          prop === 'cn'
            ? (...classes: unknown[]) => classes.filter((c) => typeof c === 'string').join(' ')
            : () => String(prop),
      },
    ),
}))

// The real i18n provider logs through the same package, so only the boundary's report is stubbed.
vi.mock('@molecule/app-logger', async (importOriginal) => ({
  ...(await importOriginal<typeof AppLogger>()),
  error: vi.fn(),
}))

const { RootErrorBoundary } = await import('../RootErrorBoundary.js')

/** A child that fails to render, so the boundary shows its recovery alert. */
const Broken = defineComponent({
  name: 'Broken',
  setup() {
    throw new Error('render failed')
  },
})

const mounted: (() => void)[] = []
afterEach(() => {
  for (const unmount of mounted.splice(0)) unmount()
  vi.restoreAllMocks()
})

describe('RootErrorBoundary after a language switch', () => {
  it('shows its recovery message in the new language', async () => {
    // Vue reports the caught render error on the console; the boundary is the subject here.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const provider = createSimpleI18nProvider('en', [
      {
        code: 'en',
        name: 'English',
        translations: { 'error.unknown': 'An unexpected error occurred.' },
      },
      {
        code: 'fr',
        name: 'Français',
        translations: { 'error.unknown': "Une erreur inattendue s'est produite." },
      },
    ])
    setProvider(provider)
    const container = document.createElement('div')
    document.body.append(container)
    const app = createApp({
      render: () => h(RootErrorBoundary, null, { default: () => [h(Broken)] }),
    })
    mounted.push(() => {
      app.unmount()
      container.remove()
    })
    app.mount(container)
    await nextTick()
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'An unexpected error occurred.',
    )

    await provider.setLocale('fr')
    await nextTick()

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "Une erreur inattendue s'est produite.",
    )
  })
})
