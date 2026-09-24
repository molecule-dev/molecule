/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: `bootstrapApp` awaits the provider
 * setup (including the optional async bond) and then mounts `<App />` on `#root`.
 *
 * @module
 */
import type { JSX } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { registerLocaleModule, t } from '@molecule/app-i18n'
import { hasProvider as hasKeyboardShortcuts } from '@molecule/app-keyboard-shortcuts'
import * as commonLocales from '@molecule/app-locales-common'
import { hasClassMap } from '@molecule/app-ui'

import {
  bootstrapApp,
  createDefaultAuthClientWithHttpSync,
  setupAllDefaultBonds,
} from '../index.js'
import { setupAppKeyboardShortcutsHotkeys } from '../optional/keyboard-shortcuts-hotkeys.js'

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('README @example', () => {
  it('wires the default + optional bonds, then mounts <App /> on #root', async () => {
    // The outside world: no real API server in a unit test.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({}), { status: 401 })),
    )
    const root = document.createElement('div')
    root.id = 'root'
    document.body.appendChild(root)

    /**
     * The example's root component.
     *
     * @returns The translated page heading.
     */
    function App(): JSX.Element {
      return <h1>{t('auth.login.signInTitle', undefined, { defaultValue: 'Welcome back' })}</h1>
    }

    const { authClient, setupAuthDefault } = createDefaultAuthClientWithHttpSync({
      baseURL: '/api',
    })

    bootstrapApp({
      App,
      authClient,
      setupProviders: async () => {
        setupAllDefaultBonds()
        registerLocaleModule(commonLocales)
        setupAuthDefault()
        await setupAppKeyboardShortcutsHotkeys()
      },
    })

    await vi.waitFor(() => {
      expect(root.querySelector('h1')?.textContent).toBe('Welcome back')
    })
    expect(hasKeyboardShortcuts()).toBe(true)
    expect(hasClassMap()).toBe(true)
  })
})
