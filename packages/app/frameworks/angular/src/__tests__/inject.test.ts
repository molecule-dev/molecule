// @vitest-environment jsdom

/**
 * `injectProvider` throws React's provider-missing error under this package's
 * own error-key namespace. A marker i18n provider proves each hook's error is
 * fetched through its LITERAL key (`angular.error.<hookSuffix>` — the same
 * suffix the React hooks use), never a key built at runtime.
 *
 * @module
 */

import '@angular/compiler'
import { InjectionToken, runInInjectionContext } from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getProvider, type I18nProvider, setProvider } from '@molecule/app-i18n'

import { injectProvider, type ProviderErrorKey } from '../inject.js'

const TOKEN = new InjectionToken<unknown>('inject-test-token')

/** Every key {@link injectProvider} can produce — the hooks' React suffixes. */
const KEYS: ProviderErrorKey[] = [
  'useAuthOutsideProvider',
  'useEditorOutsideProvider',
  'useHttpOutsideProvider',
  'useLoggerOutsideProvider',
  'usePreviewOutsideProvider',
  'useRouterOutsideProvider',
  'useStorageOutsideProvider',
  'useThemeOutsideProvider',
  'useWorkspaceOutsideProvider',
]

/** English text each hook's key carries in the angular locale bond (React's text). */
const ENGLISH: Record<ProviderErrorKey, string> = {
  useAuthOutsideProvider: 'useAuthClient must be used within an AuthProvider',
  useEditorOutsideProvider: 'useEditorProvider must be used within an EditorProvider',
  useHttpOutsideProvider: 'useHttpClient must be used within an HttpProvider',
  useLoggerOutsideProvider: 'useLoggerProvider must be used within a LoggerProvider',
  usePreviewOutsideProvider: 'usePreviewProvider must be used within a PreviewProvider',
  useRouterOutsideProvider: 'useRouterInstance must be used within a RouterProvider',
  useStorageOutsideProvider: 'useStorageProvider must be used within a StorageProvider',
  useThemeOutsideProvider: 'useThemeProvider must be used within a ThemeProvider',
  useWorkspaceOutsideProvider: 'useWorkspaceProvider must be used within a WorkspaceProvider',
}

describe('injectProvider error keys', () => {
  // Angular schedules an image-performance scan a few seconds after every
  // `createApplication`; with real timers it fires after this file's jsdom
  // environment is gone and crashes the worker (NG0210). Hold the clock.
  beforeAll(() => {
    vi.useFakeTimers()
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  const saved = getProvider()

  afterEach(() => {
    setProvider(saved)
  })

  it('throws with the literal angular.error.<hook> key for every hook', async () => {
    const app = await createApplication({ providers: [] })
    setProvider({ t: (key: string) => `t:${key}` } as Partial<I18nProvider> as I18nProvider)
    try {
      for (const key of KEYS) {
        expect(() => runInInjectionContext(app.injector, () => injectProvider(TOKEN, key))).toThrow(
          `t:angular.error.${key}`,
        )
      }
    } finally {
      app.destroy()
    }
  })

  it('falls back to the hook’s English text when the key is not translated', async () => {
    const app = await createApplication({ providers: [] })
    try {
      for (const key of KEYS) {
        expect(() => runInInjectionContext(app.injector, () => injectProvider(TOKEN, key))).toThrow(
          ENGLISH[key],
        )
      }
    } finally {
      app.destroy()
    }
  })
})
