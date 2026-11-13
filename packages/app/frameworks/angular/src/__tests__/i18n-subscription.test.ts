// @vitest-environment jsdom

/**
 * `provideMolecule({ i18n })` follows locale changes for the reactive `t()`, and the
 * subscription ends with the app: a destroyed app (a test host, a micro-frontend, an
 * HMR reload) must not keep a listener on the shared i18n provider.
 *
 * @module
 */

import '@angular/compiler'
import { provideZonelessChangeDetection } from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { describe, expect, it } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'

import { provideMolecule } from '../providers.js'

/** An i18n provider that only tracks its locale listeners. */
const listeningI18n = (): { provider: I18nProvider; listeners: Set<(locale: string) => void> } => {
  const listeners = new Set<(locale: string) => void>()
  const provider = {
    onLocaleChange: (listener: (locale: string) => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  } as Partial<I18nProvider> as I18nProvider
  return { provider, listeners }
}

describe('provideMolecule i18n subscription', () => {
  it('subscribes while the app lives and unsubscribes when it is destroyed', async () => {
    const { provider, listeners } = listeningI18n()
    const app = await createApplication({
      providers: [provideZonelessChangeDetection(), provideMolecule({ i18n: provider })],
    })
    expect(listeners.size).toBe(1)
    app.destroy()
    expect(listeners.size).toBe(0)
  })
})
