// @vitest-environment jsdom
/**
 * SearchPanel's own text goes through i18n — including the parts a screenshot
 * cannot see: a port of
 * `@molecule/app-ide-react/src/__tests__/SearchPanel.i18n.test.tsx` with the
 * same test names and the same assertions, mounted through Angular's own
 * `createApplication` with the theme and HTTP providers.
 *
 * - the glyph toggles (`Aa`, `ab`, `.*`, `⋯`) expose their translated `title`
 *   as the accessible name (`aria-label`), and the glyph itself is decorative
 *   (`aria-hidden="true"`) — a screen reader says "Match Case, toggle button",
 *   never "Aa, toggle button";
 * - the excluded-directories input's placeholder (`node_modules, .git, dist`)
 *   is an EXAMPLE of the input, the same in every language, so the field
 *   carries HTML's `translate="no"` instead of a t() key.
 *
 * A marker translator whose text names the key proves each string goes through
 * `t` with the right key.
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
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { provideDomPlacement, provideHttp, provideTheme } from '@molecule/app-angular'
import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import type { HttpClient } from '@molecule/app-http'
import {
  createSimpleI18nProvider,
  type I18nProvider as I18nProviderContract,
  setProvider,
} from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { SearchPanel } from '../components/search-panel.component.js'

/** A provider whose `t` returns `⟦<key>⟧` — the key is what renders. */
function buildMarkerProvider(): I18nProviderContract {
  const base = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', direction: 'ltr', translations: {} },
  ])
  return {
    ...base,
    t: (key) => `⟦${key}⟧`,
  }
}

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

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

/** The JIT host, whose template binds the one input the test needs. */
const SearchPanelHost = Component({
  selector: 'mol-search-panel-host',
  standalone: true,
  imports: [SearchPanel],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-search-panel [projectId]="p['projectId']"></div>`,
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
  await new Promise((resolve) => setTimeout(resolve, 0))
  current.appRef.tick()
}

/**
 * Mounts the panel with the marker provider, the way a host does.
 *
 * @param provider - The i18n provider.
 * @returns The mounted container.
 */
async function renderPanel(provider: I18nProviderContract): Promise<HTMLElement> {
  setProvider(provider)
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideTheme(createFakeThemeProvider('light', sink)),
      provideHttp(buildHttpClient()),
    ],
  })
  const ref: ComponentRef<InstanceType<typeof SearchPanelHost>> = createComponent(SearchPanelHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = { projectId: 'proj-i18n' }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  await flush()
  return container
}

/** A glyph toggle's accessible name and its decorative glyph, by mol id. */
function toggle(
  container: HTMLElement,
  molId: string,
): {
  button: HTMLElement
  ariaLabel: string | null
  glyph: string
  glyphHidden: string | null
} {
  const button = container.querySelector(`[data-mol-id="${molId}"]`)
  expect(button, `${molId} must be mounted`).not.toBeNull()
  const glyphSpan = button!.querySelector('span[aria-hidden="true"]')
  expect(glyphSpan, `${molId} must wrap its glyph in an aria-hidden span`).not.toBeNull()
  return {
    button: button as HTMLElement,
    ariaLabel: button!.getAttribute('aria-label'),
    glyph: glyphSpan!.textContent ?? '',
    glyphHidden: glyphSpan!.getAttribute('aria-hidden'),
  }
}

describe('SearchPanel accessible names and non-translated example input', () => {
  it('gives every glyph toggle a translated aria-label and hides the glyph', async () => {
    const container = await renderPanel(buildMarkerProvider())

    expect(toggle(container, 'search-toggle-case')).toMatchObject({
      ariaLabel: '⟦ide.search.caseSensitive⟧',
      glyph: 'Aa',
      glyphHidden: 'true',
    })
    expect(toggle(container, 'search-toggle-whole-word')).toMatchObject({
      ariaLabel: '⟦ide.search.wholeWord⟧',
      glyph: 'ab',
      glyphHidden: 'true',
    })
    expect(toggle(container, 'search-toggle-regex')).toMatchObject({
      ariaLabel: '⟦ide.search.regex⟧',
      glyph: '.*',
      glyphHidden: 'true',
    })
    expect(toggle(container, 'search-toggle-filters')).toMatchObject({
      ariaLabel: '⟦ide.search.toggleFilters⟧',
      glyph: '⋯',
      glyphHidden: 'true',
    })
    // The first mount pays Angular's JIT template compile on top of the suite
    // setup; the render itself is instant once the template is cached.
  }, 30000)

  it('keeps the visible text of the glyph toggles out of the accessible tree', async () => {
    const container = await renderPanel(buildMarkerProvider())
    for (const molId of [
      'search-toggle-case',
      'search-toggle-whole-word',
      'search-toggle-regex',
      'search-toggle-filters',
    ]) {
      const { button } = toggle(container, molId)
      // The accessible name is the translated title, never the glyph itself.
      expect(button.textContent).not.toBe(button.getAttribute('aria-label'))
    }
  }, 30000)

  it('marks the excluded-directories input translate="no" (its placeholder is an example, not prose)', async () => {
    const container = await renderPanel(buildMarkerProvider())
    toggle(container, 'search-toggle-filters').button.click()
    await flush()

    const input = container.querySelector('input[data-mol-id="search-excluded-dirs"]')
    expect(input, 'the filters row must expose the excluded-dirs input').not.toBeNull()
    expect(input!.getAttribute('translate')).toBe('no')
    // The placeholder stays the example list — no key, no marker.
    expect(input!.getAttribute('placeholder')).toBe('node_modules, .git, dist')
  }, 30000)
})
