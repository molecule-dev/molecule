// @vitest-environment jsdom

/**
 * `QuickOpen` fetches the project's file list and hands it to {@link QuickPicker}.
 * It can be re-pointed at another project without a remount, and the picker must
 * show its loading state — not the previous project's files — in the render that
 * carries the new project id. These tests pin that reset and the reload.
 *
 * @module
 */

import { cleanup, render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { HttpProvider, ThemeProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { QuickOpen } from '../components/QuickOpen.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** One file per project, so a stale list is unmistakable. */
const FILES_BY_PROJECT: Record<string, string[]> = {
  p1: ['/workspace/p1.ts'],
  p2: ['/workspace/p2.ts'],
}

/**
 * A typed {@link HttpResponse} wrapper for a resolved value.
 * @param data - The response body.
 * @returns The response.
 */
function ok<T>(data: T): HttpResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as HttpResponse<T>['config'],
  }
}

/**
 * Serves each project its own single-file list.
 * @returns A stub {@link HttpClient}.
 */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: (async (url: string) => {
      const match = /\/projects\/([^/]+)\/files-list$/.exec(url)
      if (!match) throw new Error(`unexpected GET ${url}`)
      return ok({ files: FILES_BY_PROJECT[match[1]] ?? [] })
    }) as HttpClient['get'],
    post: reject,
    put: reject,
    patch: reject,
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/**
 * Wrap children with the providers the overlay resolves against.
 * @param root0 - Wrapper props.
 * @param root0.children - The component(s) under test.
 * @returns The wrapped tree.
 */
function Wrap({ children }: { children: ReactNode }): ReactElement {
  return (
    <ThemeProvider provider={buildThemeProvider()}>
      <HttpProvider client={buildHttpClient()}>{children}</HttpProvider>
    </ThemeProvider>
  )
}

const onFileOpen = vi.fn()
const onDismiss = vi.fn()

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // jsdom has no scrollIntoView; QuickPicker scrolls the selected row into view.
  Element.prototype.scrollIntoView = (): void => {}
  onFileOpen.mockClear()
  onDismiss.mockClear()
})

afterEach(cleanup)

describe('QuickOpen project switch', () => {
  it('shows loading, not the previous project’s files, when the project id changes', async () => {
    const { baseElement: container, rerender } = render(
      <Wrap>
        <QuickOpen projectId="p1" onFileOpen={onFileOpen} onDismiss={onDismiss} />
      </Wrap>,
    )
    await waitFor(() =>
      expect(
        container.querySelector('[data-mol-id="quick-picker-item-/workspace/p1.ts"]'),
      ).not.toBeNull(),
    )

    rerender(
      <Wrap>
        <QuickOpen projectId="p2" onFileOpen={onFileOpen} onDismiss={onDismiss} />
      </Wrap>,
    )

    // The render carrying the new project id is already in the loading state.
    expect(container.querySelector('[data-mol-id="quick-picker-item-/workspace/p1.ts"]')).toBeNull()
    expect(container.textContent).toContain('Loading')

    await waitFor(() =>
      expect(
        container.querySelector('[data-mol-id="quick-picker-item-/workspace/p2.ts"]'),
      ).not.toBeNull(),
    )
    expect(container.querySelector('[data-mol-id="quick-picker-item-/workspace/p1.ts"]')).toBeNull()
  })
})
