// @vitest-environment jsdom

/**
 * SearchPanel's excluded-directories draft follows the host's persisted set.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/SearchPanel.excluded-dirs.test.tsx`
 * with the same test names and the same assertions, mounted through Svelte 5's
 * own `mount`/`flushSync`.
 *
 * The draft text is reset in the render that receives a new `excludedDirs`
 * prop, so the field never shows the previous set for a committed frame after
 * the host changes it. Editing the field and blurring still parses,
 * de-duplicates and commits the set through `onExcludedDirsChange`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import type { SearchPanelProps } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import SearchPanelExcludedDirsHost from './SearchPanelExcludedDirsHost.svelte'
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

/** Tears down the mount alive right now, if any. */
let teardown: (() => Promise<void>) | null = null
let container: HTMLElement | null = null

beforeEach(() => {
  setClassMap(classMap)
})

afterEach(async () => {
  if (teardown) await teardown()
  teardown = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
})

/**
 * The panel wrapped in the contexts it needs.
 *
 * @param excludedDirs - The host's persisted set.
 * @param onExcludedDirsChange - The commit callback.
 * @returns The container and a prop replacer.
 */
function panel(
  excludedDirs: string[],
  onExcludedDirsChange?: (dirs: string[]) => void,
): { container: HTMLElement; setDirs: (next: string[]) => void } {
  document.body.innerHTML = ''
  container = document.createElement('div')
  document.body.appendChild(container)
  const initial: SearchPanelProps = {
    projectId: 'proj-excluded-dirs',
    excludedDirs,
    onExcludedDirsChange,
  }
  const mounted = mount(SearchPanelExcludedDirsHost, {
    target: container,
    props: {
      theme: buildThemeProvider(),
      http: buildHttpClient(),
      i18n: createSimpleI18nProvider('en'),
      initial,
    },
  })
  teardown = () => unmount(mounted)
  flushSync()
  const host = container
  return {
    container: host,
    setDirs: (next: string[]): void => {
      mounted.setProps({
        projectId: 'proj-excluded-dirs',
        excludedDirs: next,
        onExcludedDirsChange,
      })
      flushSync()
    },
  }
}

/** Opens the filters row and returns the excluded-directories input. */
function openExcludedInput(host: HTMLElement): HTMLInputElement {
  ;(host.querySelector('[data-mol-id="search-toggle-filters"]') as HTMLElement).click()
  flushSync()
  const input = host.querySelector('input[data-mol-id="search-excluded-dirs"]')
  expect(input, 'the filters row must expose the excluded-dirs input').not.toBeNull()
  return input as HTMLInputElement
}

/**
 * Types a value into an input like a user does (React's `fireEvent.change`).
 *
 * @param input - The field.
 * @param value - The new value.
 */
function change(input: HTMLInputElement, value: string): void {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  flushSync()
}

/**
 * Blurs an input like a user does: the DOM's `blur` (non-bubbling) followed by
 * the bubbling `focusout` React derives `onBlur` from.
 *
 * @param input - The field.
 */
function blur(input: HTMLInputElement): void {
  input.dispatchEvent(new FocusEvent('blur'))
  input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  flushSync()
}

describe('SearchPanel excluded-directories draft', () => {
  it('resets the draft to the set the host hands it', () => {
    const { container: host, setDirs } = panel(['node_modules'])
    const input = openExcludedInput(host)
    expect(input.value).toBe('node_modules')

    setDirs(['node_modules', 'dist'])
    expect(input.value).toBe('node_modules, dist')
  })

  it('replaces a dirty draft with the host set (the host is the source of truth)', () => {
    const { container: host, setDirs } = panel(['node_modules'])
    const input = openExcludedInput(host)
    change(input, 'half-typed-dir')
    expect(input.value).toBe('half-typed-dir')

    setDirs(['node_modules', '.git'])
    expect(input.value).toBe('node_modules, .git')
  })

  it('commits the parsed, de-duplicated set on blur', () => {
    const onExcludedDirsChange = vi.fn()
    const { container: host } = panel(['node_modules'], onExcludedDirsChange)
    const input = openExcludedInput(host)

    change(input, ' dist , dist, .git , not a dir ')
    blur(input)

    // Trimmed, de-duplicated, invalid entries dropped, and written back tidy.
    expect(onExcludedDirsChange).toHaveBeenCalledWith(['dist', '.git'])
    expect(input.value).toBe('dist, .git')
  })
})
