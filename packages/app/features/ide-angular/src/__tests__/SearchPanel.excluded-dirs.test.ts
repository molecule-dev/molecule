// @vitest-environment jsdom
/**
 * SearchPanel's excluded-directories draft — a port of
 * `@molecule/app-ide-react/src/__tests__/SearchPanel.excluded-dirs.test.tsx`
 * with the same test names and the same behavioral assertions, mounted through
 * Angular's own `createApplication`.
 *
 * The draft text is reset in the render that receives a new `excludedDirs` input
 * (React's "adjust state when a prop changes" pattern), so the field never shows
 * the previous set for a committed frame after the host changes it. Editing the
 * field and blurring still parses, de-duplicates and commits the set through
 * `onExcludedDirsChange`.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement, provideHttp, provideI18n, provideTheme } from '@molecule/app-angular'
import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { SearchPanel } from '../components/search-panel.component.js'

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

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

/**
 * The JIT host the way the conformance kit mounts the component: its template
 * binds every input the test drives.
 */
const SearchPanelHost = Component({
  selector: 'mol-search-panel-host',
  standalone: true,
  imports: [SearchPanel],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-search-panel [projectId]="p['projectId']" [excludedDirs]="p['excludedDirs']" [onExcludedDirsChange]="p['onExcludedDirsChange']"></div>`,
})(
  class SearchPanelHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** One mounted panel, with its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof SearchPanelHost>>
  container: HTMLElement
}

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/** Lets Angular's zoneless change detection settle what an event queued. */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  current.appRef.tick()
}

/**
 * Mounts the panel with the host's excluded-dir set.
 *
 * @param excludedDirs - The host's persisted set.
 * @param onExcludedDirsChange - The persistence callback.
 * @returns The mount.
 */
async function renderPanel(
  excludedDirs: string[],
  onExcludedDirsChange?: (dirs: string[]) => void,
): Promise<Mounted> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideI18n(createSimpleI18nProvider('en')),
      provideTheme(createFakeThemeProvider('light', sink)),
      provideHttp(buildHttpClient()),
    ],
  })
  const ref: ComponentRef<InstanceType<typeof SearchPanelHost>> = createComponent(SearchPanelHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = { projectId: 'proj-excluded-dirs', excludedDirs, onExcludedDirsChange }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  await flush()
  return current
}

/**
 * Replaces the host's set, as React's `rerender` does.
 *
 * @param mounted - The mount.
 * @param excludedDirs - The new host set.
 * @param onExcludedDirsChange - The persistence callback.
 * @returns Resolves once the view rendered it.
 */
async function setDirs(
  mounted: Mounted,
  excludedDirs: string[],
  onExcludedDirsChange?: (dirs: string[]) => void,
): Promise<void> {
  mounted.ref.instance.p = { projectId: 'proj-excluded-dirs', excludedDirs, onExcludedDirsChange }
  mounted.ref.changeDetectorRef.markForCheck()
  mounted.appRef.tick()
}

/**
 * Opens the filters row and returns the excluded-directories input.
 *
 * @param container - The render container.
 * @returns The input.
 */
async function openExcludedInput(container: HTMLElement): Promise<HTMLInputElement> {
  const toggle = container.querySelector('[data-mol-id="search-toggle-filters"]')
  expect(toggle, 'the filters toggle must render').not.toBeNull()
  ;(toggle as HTMLButtonElement).click()
  await flush()
  const input = container.querySelector('input[data-mol-id="search-excluded-dirs"]')
  expect(input, 'the filters row must expose the excluded-dirs input').not.toBeNull()
  return input as HTMLInputElement
}

/**
 * Types a value into the input the way a user does (the input + the Angular
 * binding's change detection).
 *
 * @param input - The field.
 * @param value - The typed value.
 * @returns Resolves once the view rendered it.
 */
async function type(input: HTMLInputElement, value: string): Promise<void> {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await flush()
}

describe('SearchPanel excluded-directories draft', () => {
  it('resets the draft to the set the host hands it', async () => {
    const mounted = await renderPanel(['node_modules'])
    const input = await openExcludedInput(mounted.container)
    expect(input.value).toBe('node_modules')

    await setDirs(mounted, ['node_modules', 'dist'])
    expect(input.value).toBe('node_modules, dist')
  })

  it('replaces a dirty draft with the host set (the host is the source of truth)', async () => {
    const mounted = await renderPanel(['node_modules'])
    const input = await openExcludedInput(mounted.container)
    await type(input, 'half-typed-dir')
    expect(input.value).toBe('half-typed-dir')

    await setDirs(mounted, ['node_modules', '.git'])
    expect(input.value).toBe('node_modules, .git')
  })

  it('commits the parsed, de-duplicated set on blur', async () => {
    const onExcludedDirsChange = vi.fn<(dirs: string[]) => void>()
    const mounted = await renderPanel(['node_modules'], onExcludedDirsChange)
    const input = await openExcludedInput(mounted.container)

    await type(input, ' dist , dist, .git , not a dir ')
    input.dispatchEvent(new Event('focusout', { bubbles: true }))
    await flush()

    // Trimmed, de-duplicated, invalid entries dropped, and written back tidy.
    expect(onExcludedDirsChange).toHaveBeenCalledWith(['dist', '.git'])
    expect(input.value).toBe('dist, .git')
  })
})
