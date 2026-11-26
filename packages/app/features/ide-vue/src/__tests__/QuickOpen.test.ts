// @vitest-environment jsdom

/**
 * `QuickOpen` fetches the project's file list and hands it to {@link QuickPicker}.
 * It can be re-pointed at another project without a remount, and the picker must
 * show its loading state — not the previous project's files — in the render that
 * carries the new project id. These tests pin that reset and the reload.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/QuickOpen.test.tsx` with the
 * same test name and the same assertions, mounted through Vue's own `createApp`
 * under the theme and http plugins (the providers the picker and the fetch need).
 * The http stub answers each project's own request a macrotask later, so the
 * render that carries the new project id is observable before its files arrive.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, reactive, type VNodeChild } from 'vue'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createHttpPlugin, createThemePlugin } from '@molecule/app-vue'

import { QuickOpen } from '../components/QuickOpen.js'
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
function responseOf(data: unknown): HttpResponse<never> {
  // The payload stands in for the server's reply; the client contract is
  // caller-generic, which no concrete payload can prove, so the stub types it
  // never and the interface widens it to the caller's T.
  return {
    data: data as never,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { method: 'GET', url: '' },
  }
}

/**
 * Serves each project its own single-file list, one macrotask later (so a
 * project switch's loading render is observable before the list lands).
 *
 * @returns A stub {@link HttpClient}.
 */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: async (url: string): Promise<HttpResponse<never>> => {
      const match = /\/projects\/([^/]+)\/files-list$/.exec(url)
      if (!match) throw new Error(`unexpected GET ${url}`)
      await new Promise((resolve) => setTimeout(resolve, 0))
      return responseOf({ files: FILES_BY_PROJECT[match[1]] ?? [] })
    },
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

const onFileOpen = vi.fn<(path: string) => void>()
const onDismiss = vi.fn<() => void>()

/** The app and host this file last mounted, torn down before the next render. */
const mounted: { app?: ReturnType<typeof createApp>; host?: HTMLElement } = {}

/**
 * Mounts {@link QuickOpen} over the stub client, the way the app does.
 *
 * @param projectId - The first project id.
 * @returns The mount host and the reactive props to drive the switch.
 */
function mount(projectId: string): {
  container: HTMLElement
  props: { projectId: string }
} {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.host = host
  const props = reactive({ projectId })
  const app = createApp({
    render: (): VNodeChild =>
      h(QuickOpen, {
        projectId: props.projectId,
        onFileOpen,
        onDismiss,
      }),
  })
  app.use(createThemePlugin(buildThemeProvider()))
  app.use(createHttpPlugin(buildHttpClient()))
  mounted.app = app
  app.mount(host)
  return { container: host.ownerDocument.body, props }
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // jsdom has no scrollIntoView; QuickPicker scrolls the selected row into view.
  Element.prototype.scrollIntoView = (): void => {}
  onFileOpen.mockClear()
  onDismiss.mockClear()
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  mounted.host?.remove()
  mounted.host = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('QuickOpen project switch', () => {
  it('shows loading, not the previous project’s files, when the project id changes', async () => {
    const { container, props } = mount('p1')
    await vi.waitFor(() =>
      expect(
        container.ownerDocument.querySelector('[data-mol-id="quick-picker-item-/workspace/p1.ts"]'),
      ).not.toBeNull(),
    )

    props.projectId = 'p2'
    await nextTick()

    // The render carrying the new project id is already in the loading state.
    expect(
      container.ownerDocument.querySelector('[data-mol-id="quick-picker-item-/workspace/p1.ts"]'),
    ).toBeNull()
    expect(container.ownerDocument.querySelector('[role="dialog"]')?.textContent).toContain(
      'Loading',
    )

    await vi.waitFor(() =>
      expect(
        container.ownerDocument.querySelector('[data-mol-id="quick-picker-item-/workspace/p2.ts"]'),
      ).not.toBeNull(),
    )
    expect(
      container.ownerDocument.querySelector('[data-mol-id="quick-picker-item-/workspace/p1.ts"]'),
    ).toBeNull()
  })
})
