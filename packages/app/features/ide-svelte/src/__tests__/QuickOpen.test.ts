// @vitest-environment jsdom

/**
 * `QuickOpen` fetches the project's file list and hands it to `QuickPicker`.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/QuickOpen.test.tsx` with the
 * same test name and the same assertions, mounted through Svelte 5's own
 * `mount`/`flushSync`.
 *
 * It can be re-pointed at another project without a remount, and the picker must
 * show its loading state — not the previous project's files — in the render that
 * carries the new project id. These tests pin that reset and the reload.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import QuickOpenHost from './QuickOpenHost.svelte'
import { buildThemeProvider } from './theme-test-provider.js'

/** One file per project, so a stale list is unmistakable. */
const FILES_BY_PROJECT: Record<string, string[]> = {
  p1: ['/workspace/p1.ts'],
  p2: ['/workspace/p2.ts'],
}

/**
 * A typed {@link HttpResponse} wrapper for a resolved value.
 *
 * @param data - The response body.
 * @returns The response.
 */
function ok<T>(data: T): HttpResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { method: 'GET', url: '' },
  }
}

/**
 * Serves each project its own single-file list.
 *
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

const onFileOpen = vi.fn()
const onDismiss = vi.fn()

/** Tears down the mount alive right now, if any. */
let teardown: (() => Promise<void>) | null = null
let container: HTMLElement | null = null

beforeEach(() => {
  setClassMap(classMap)
  // jsdom has no scrollIntoView; QuickPicker scrolls the selected row into view.
  Element.prototype.scrollIntoView = (): void => {}
  onFileOpen.mockClear()
  onDismiss.mockClear()
})

afterEach(async () => {
  if (teardown) await teardown()
  teardown = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
})

/**
 * Mounts the overlay at a project.
 *
 * @param projectId - The project whose files are listed.
 * @returns The container and a project replacer.
 */
function render(projectId: string): {
  container: HTMLElement
  setProject: (next: string) => void
} {
  document.body.innerHTML = ''
  container = document.createElement('div')
  document.body.appendChild(container)
  const mounted = mount(QuickOpenHost, {
    target: container,
    props: {
      theme: buildThemeProvider(),
      http: buildHttpClient(),
      i18n: createSimpleI18nProvider('en'),
      initial: { projectId, onFileOpen, onDismiss },
    },
  })
  teardown = () => unmount(mounted)
  flushSync()
  const host = container
  return {
    container: host.ownerDocument.body,
    setProject: (next: string): void => {
      mounted.setProps({ projectId: next, onFileOpen, onDismiss })
      flushSync()
    },
  }
}

describe('QuickOpen project switch', () => {
  it('shows loading, not the previous project’s files, when the project id changes', async () => {
    const { container: host, setProject } = render('p1')
    await vi.waitFor(() =>
      expect(
        host.ownerDocument.querySelector('[data-mol-id="quick-picker-item-/workspace/p1.ts"]'),
      ).not.toBeNull(),
    )

    setProject('p2')

    // The render carrying the new project id is already in the loading state.
    expect(
      host.ownerDocument.querySelector('[data-mol-id="quick-picker-item-/workspace/p1.ts"]'),
    ).toBeNull()
    expect(host.ownerDocument.querySelector('[role="dialog"]')?.textContent).toContain('Loading')

    await vi.waitFor(() =>
      expect(
        host.ownerDocument.querySelector('[data-mol-id="quick-picker-item-/workspace/p2.ts"]'),
      ).not.toBeNull(),
    )
    expect(
      host.ownerDocument.querySelector('[data-mol-id="quick-picker-item-/workspace/p1.ts"]'),
    ).toBeNull()
  })
})
