// @vitest-environment jsdom

/**
 * SearchPanel's excluded-directories draft follows the host's persisted set.
 *
 * The draft text is reset in the render that receives a new `excludedDirs`
 * prop (React's "adjust state when a prop changes" pattern), so the field never
 * shows the previous set for a committed frame after the host changes it.
 * Editing the field and blurring still parses, de-duplicates and commits the
 * set through `onExcludedDirsChange`.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { HttpProvider, ThemeProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

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

/** The panel wrapped in the contexts it needs. */
function panel(
  excludedDirs: string[],
  onExcludedDirsChange?: (dirs: string[]) => void,
): ReactElement {
  const wrap = (children: ReactNode): ReactElement => (
    <ThemeProvider provider={buildThemeProvider()}>
      <HttpProvider client={buildHttpClient()}>{children}</HttpProvider>
    </ThemeProvider>
  )
  return wrap(
    <SearchPanel
      projectId="proj-excluded-dirs"
      excludedDirs={excludedDirs}
      onExcludedDirsChange={onExcludedDirsChange}
    />,
  )
}

/** Opens the filters row and returns the excluded-directories input. */
function openExcludedInput(container: HTMLElement): HTMLInputElement {
  fireEvent.click(container.querySelector('[data-mol-id="search-toggle-filters"]') as HTMLElement)
  const input = container.querySelector('input[data-mol-id="search-excluded-dirs"]')
  expect(input, 'the filters row must expose the excluded-dirs input').not.toBeNull()
  return input as HTMLInputElement
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  stubMatchMedia()
})

afterEach(cleanup)

describe('SearchPanel excluded-directories draft', () => {
  it('resets the draft to the set the host hands it', () => {
    const { container, rerender } = render(panel(['node_modules']))
    const input = openExcludedInput(container)
    expect(input.value).toBe('node_modules')

    rerender(panel(['node_modules', 'dist']))
    expect(input.value).toBe('node_modules, dist')
  })

  it('replaces a dirty draft with the host set (the host is the source of truth)', () => {
    const { container, rerender } = render(panel(['node_modules']))
    const input = openExcludedInput(container)
    fireEvent.change(input, { target: { value: 'half-typed-dir' } })
    expect(input.value).toBe('half-typed-dir')

    rerender(panel(['node_modules', '.git']))
    expect(input.value).toBe('node_modules, .git')
  })

  it('commits the parsed, de-duplicated set on blur', () => {
    const onExcludedDirsChange = vi.fn()
    const { container } = render(panel(['node_modules'], onExcludedDirsChange))
    const input = openExcludedInput(container)

    fireEvent.change(input, { target: { value: ' dist , dist, .git , not a dir ' } })
    fireEvent.blur(input)

    // Trimmed, de-duplicated, invalid entries dropped, and written back tidy.
    expect(onExcludedDirsChange).toHaveBeenCalledWith(['dist', '.git'])
    expect(input.value).toBe('dist, .git')
  })
})
