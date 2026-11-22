// @vitest-environment jsdom
/**
 * SearchPanel's excluded-directories draft follows the host's persisted set — a
 * port of `@molecule/app-ide-react/src/__tests__/SearchPanel.excluded-dirs.test.tsx`
 * with the same test names and the same assertions, mounted as a real Solid root
 * under `MoleculeProvider` with the theme and http services the panel needs.
 *
 * The draft text is reset in the render that receives a new `excludedDirs`
 * prop, so the field never shows the previous set for a committed frame after
 * the host changes it. Editing the field and blurring still parses,
 * de-duplicates and commits the set through `onExcludedDirsChange`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { SearchPanel } from '../index.js'
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

/** jsdom has no `matchMedia`; the viewport hooks answer every query false. */
function stubMatchMedia(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList =>
      Object.assign(new EventTarget(), {
        matches: false,
        media: query,
        onchange: null,
        addListener: (): void => undefined,
        removeListener: (): void => undefined,
      }),
  })
}

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

/**
 * Mounts the panel over an `excludedDirs` the test can replace without a remount.
 * @param dirs - The host's set, as a reactive accessor.
 * @param onExcludedDirsChange - The commit callback.
 * @returns The render container.
 */
function renderPanel(
  dirs: () => string[],
  onExcludedDirsChange?: (dirs: string[]) => void,
): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <MoleculeProvider theme={buildThemeProvider()} http={buildHttpClient()}>
        <SearchPanel
          projectId="proj-excluded-dirs"
          excludedDirs={dirs()}
          onExcludedDirsChange={onExcludedDirsChange}
        />
      </MoleculeProvider>
    ),
    container,
  )
  return container
}

/**
 * Opens the filters row and returns the excluded-directories input.
 * @param container - The render container.
 * @returns The excluded-dirs input.
 */
function openExcludedInput(container: HTMLElement): HTMLInputElement {
  ;(container.querySelector('[data-mol-id="search-toggle-filters"]') as HTMLElement).click()
  const input = container.querySelector('input[data-mol-id="search-excluded-dirs"]')
  expect(input, 'the filters row must expose the excluded-dirs input').not.toBeNull()
  return input as HTMLInputElement
}

/**
 * Types a value into a field the way a user does (the input event Solid's
 * `onInput` listens to).
 * @param input - The field.
 * @param value - The new text.
 */
function type(input: HTMLInputElement, value: string): void {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Blurs a field the way a user does — the bubbling `focusout` Solid's
 * `onfocusout` (React's `onBlur`) derives from.
 * @param input - The field.
 */
function blur(input: HTMLInputElement): void {
  input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
}

beforeEach(() => {
  setClassMap(classMap)
  stubMatchMedia()
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
})

describe('SearchPanel excluded-directories draft', () => {
  it('resets the draft to the set the host hands it', () => {
    const [dirs, setDirs] = createSignal(['node_modules'])
    const container = renderPanel(() => dirs())
    const input = openExcludedInput(container)
    expect(input.value).toBe('node_modules')

    setDirs(['node_modules', 'dist'])
    expect(input.value).toBe('node_modules, dist')
  })

  it('replaces a dirty draft with the host set (the host is the source of truth)', () => {
    const [dirs, setDirs] = createSignal(['node_modules'])
    const container = renderPanel(() => dirs())
    const input = openExcludedInput(container)
    type(input, 'half-typed-dir')
    expect(input.value).toBe('half-typed-dir')

    setDirs(['node_modules', '.git'])
    expect(input.value).toBe('node_modules, .git')
  })

  it('commits the parsed, de-duplicated set on blur', () => {
    const onExcludedDirsChange = vi.fn()
    const container = renderPanel(() => ['node_modules'], onExcludedDirsChange)
    const input = openExcludedInput(container)

    type(input, ' dist , dist, .git , not a dir ')
    blur(input)

    // Trimmed, de-duplicated, invalid entries dropped, and written back tidy.
    expect(onExcludedDirsChange).toHaveBeenCalledWith(['dist', '.git'])
    expect(input.value).toBe('dist, .git')
  })
})
