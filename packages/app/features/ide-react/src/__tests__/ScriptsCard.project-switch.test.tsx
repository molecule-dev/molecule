// @vitest-environment jsdom

/**
 * `ScriptsCard` is mounted with one `projectId` and can be re-pointed at another
 * without a remount (the IDE reuses the card). The card resets to its loading
 * state in the render that carries the new project id, so the previous
 * project's scripts are never painted under the new one — these tests pin that
 * reset and the reload that follows it.
 *
 * @module
 */

import { cleanup, render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import type { ScriptInfo } from '@molecule/app-ide-panel-logic/panels'
import { HttpProvider, I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ScriptsCard } from '../components/ScriptsCard.js'

/** One script per project, so a stale list is unmistakable. */
const SCRIPTS_BY_PROJECT: Record<string, ScriptInfo[]> = {
  p1: [{ name: 'p1-only', description: 'Belongs to p1', createdAt: '' }],
  p2: [{ name: 'p2-only', description: 'Belongs to p2', createdAt: '' }],
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
 * Serves each project its own single-script list.
 * @returns A stub {@link HttpClient}.
 */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: (async (url: string) => {
      const match = /\/projects\/([^/]+)\/scripts$/.exec(url)
      if (!match) throw new Error(`unexpected GET ${url}`)
      return ok({ scripts: SCRIPTS_BY_PROJECT[match[1]] ?? [] })
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
 * Wrap children with the i18n + http providers the card resolves against.
 * @param root0 - Wrapper props.
 * @param root0.children - The component(s) under test.
 * @returns The wrapped tree.
 */
function Wrap({ children }: { children: ReactNode }): ReactElement {
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <HttpProvider client={buildHttpClient()}>{children}</HttpProvider>
    </I18nProvider>
  )
}

beforeEach(() => {
  setClassMap(classMap)
})

afterEach(cleanup)

describe('ScriptsCard project switch', () => {
  it('drops the previous project’s rows and reloads when the project id changes', async () => {
    const { container, rerender } = render(
      <Wrap>
        <ScriptsCard projectId="p1" initialQuery="" isLight />
      </Wrap>,
    )
    await waitFor(() =>
      expect(container.querySelector('[data-mol-id="script-row-p1-only"]')).not.toBeNull(),
    )

    rerender(
      <Wrap>
        <ScriptsCard projectId="p2" initialQuery="" isLight />
      </Wrap>,
    )

    // The render that carries the new project id already shows the loading
    // state: p1's row is gone, not painted one frame under p2.
    expect(container.querySelector('[data-mol-id="script-row-p1-only"]')).toBeNull()
    expect(container.textContent).toContain('Loading scripts')

    await waitFor(() =>
      expect(container.querySelector('[data-mol-id="script-row-p2-only"]')).not.toBeNull(),
    )
    expect(container.querySelector('[data-mol-id="script-row-p1-only"]')).toBeNull()
  })
})
