// @vitest-environment jsdom

/**
 * SearchPanel's excluded-directories draft follows the host's persisted set.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/SearchPanel.excluded-dirs.test.tsx`
 * with the same test names and the same assertions, mounted through Vue's own
 * `createApp` with the theme and http plugins (the only providers the panel
 * needs).
 *
 * The draft text is reset in the render that receives a new `excludedDirs`
 * prop, so the field never shows the previous set for a committed frame after
 * the host changes it. Editing the field and blurring still parses,
 * de-duplicates and commits the set through `onExcludedDirsChange`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, reactive, type VNodeChild } from 'vue'

import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createHttpPlugin, createThemePlugin } from '@molecule/app-vue'

import { SearchPanel } from '../components/SearchPanel.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** An HTTP client whose every request rejects; the mounted callers catch their own. */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: reject,
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

/** The app and host this file last mounted, torn down before the next render. */
const mounted: { app?: ReturnType<typeof createApp>; host?: HTMLElement } = {}

/** The reactive props the host renders the panel with. */
interface PanelProps {
  /** The project whose search settings are edited. */
  projectId: string
  /** The host's persisted excluded-dir set. */
  excludedDirs: string[]
  /** Persist an edited set. */
  onExcludedDirsChange?: (dirs: string[]) => void
}

/**
 * Mounts the panel with the providers it needs.
 *
 * @param initial - The host's props.
 * @returns The mount host and the reactive props to drive the host's updates.
 */
function mount(initial: PanelProps): { container: HTMLElement; props: PanelProps } {
  mounted.app?.unmount()
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.host = host
  const props = reactive<PanelProps>({ ...initial })
  const app = createApp({
    render: (): VNodeChild =>
      h(SearchPanel, {
        projectId: props.projectId,
        excludedDirs: props.excludedDirs,
        onExcludedDirsChange: props.onExcludedDirsChange,
      }),
  })
  app.use(createThemePlugin(buildThemeProvider()))
  app.use(createHttpPlugin(buildHttpClient()))
  mounted.app = app
  app.mount(host)
  return { container: host, props }
}

/**
 * Opens the filters row and returns the excluded-directories input.
 *
 * @param container - The mount host.
 * @returns The excluded-dirs input.
 */
async function openExcludedInput(container: HTMLElement): Promise<HTMLInputElement> {
  const toggle = container.querySelector('[data-mol-id="search-toggle-filters"]') as HTMLElement
  toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await nextTick()
  const input = container.querySelector('input[data-mol-id="search-excluded-dirs"]')
  expect(input, 'the filters row must expose the excluded-dirs input').not.toBeNull()
  return input as HTMLInputElement
}

/**
 * Types a value into the excluded-dirs input.
 *
 * @param input - The input.
 * @param value - The text to type.
 */
function type(input: HTMLInputElement, value: string): void {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Blurs the excluded-dirs input (React's onBlur derives from `focusout`).
 *
 * @param input - The input.
 */
function blur(input: HTMLInputElement): void {
  input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  mounted.host?.remove()
  mounted.host = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('SearchPanel excluded-directories draft', () => {
  it('resets the draft to the set the host hands it', async () => {
    const { container, props } = mount({
      projectId: 'proj-excluded-dirs',
      excludedDirs: ['node_modules'],
    })
    const input = await openExcludedInput(container)
    expect(input.value).toBe('node_modules')

    props.excludedDirs = ['node_modules', 'dist']
    await nextTick()
    expect(input.value).toBe('node_modules, dist')
  })

  it('replaces a dirty draft with the host set (the host is the source of truth)', async () => {
    const { container, props } = mount({
      projectId: 'proj-excluded-dirs',
      excludedDirs: ['node_modules'],
    })
    const input = await openExcludedInput(container)
    type(input, 'half-typed-dir')
    await nextTick()
    expect(input.value).toBe('half-typed-dir')

    props.excludedDirs = ['node_modules', '.git']
    await nextTick()
    expect(input.value).toBe('node_modules, .git')
  })

  it('commits the parsed, de-duplicated set on blur', async () => {
    const onExcludedDirsChange = vi.fn<(dirs: string[]) => void>()
    const { container } = mount({
      projectId: 'proj-excluded-dirs',
      excludedDirs: ['node_modules'],
      onExcludedDirsChange,
    })
    const input = await openExcludedInput(container)

    type(input, ' dist , dist, .git , not a dir ')
    await nextTick()
    blur(input)
    await nextTick()

    // Trimmed, de-duplicated, invalid entries dropped, and written back tidy.
    expect(onExcludedDirsChange).toHaveBeenCalledWith(['dist', '.git'])
    expect(input.value).toBe('dist, .git')
  })
})
