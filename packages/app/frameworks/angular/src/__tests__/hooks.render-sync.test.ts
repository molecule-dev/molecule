// @vitest-environment jsdom

/**
 * The hooks that used to keep a "latest value" in a ref written during render
 * now read it through the argument or the provider itself. Both must keep the
 * behaviour the ref gave the committed tree: a value read from a new key, a new
 * scope or a new provider is rendered by the FIRST change detection after the
 * argument changes, never one change detection later.
 *
 * React records what every COMMIT saw, so a stale first commit fails even though
 * the settled DOM would look the same either way. Angular has no commit of its
 * own: a view renders on its next change detection, so each case renders the
 * probe through one template binding and reads the DOM after exactly one
 * `detectChanges()`.
 *
 * @module
 */

import '@angular/compiler'
import {
  Component,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { AppModelDefinition, ListAIModelsResponse } from '@molecule/app-ai-models'
import type { EditorProvider } from '@molecule/app-code-editor'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import type { StorageProvider } from '@molecule/app-storage'
import { setProvider } from '@molecule/app-storage'

import { resetAIModelsCache, useAIModels } from '../hooks/use-ai-models.js'
import { useEditor } from '../hooks/use-ide.js'
import { useStoragePreference, useStorageValue } from '../hooks/use-storage.js'
import { provideMolecule } from '../providers.js'

/**
 * A synchronous storage provider — the browser localStorage shape.
 *
 * @param initial - The values the provider starts with.
 * @returns The provider, its values, and its write spy.
 */
function syncProvider(initial: Record<string, unknown> = {}): StorageProvider & {
  values: Map<string, unknown>
  writes: string[]
} {
  const values = new Map<string, unknown>(Object.entries(initial))
  const writes: string[] = []
  const provider: StorageProvider = {
    async get<T = unknown>(key: string): Promise<T | null> {
      return values.has(key) ? (values.get(key) as T) : null
    },
    getSync<T = unknown>(key: string): T | null {
      return values.has(key) ? (values.get(key) as T) : null
    },
    async set<T = unknown>(key: string, value: T): Promise<void> {
      writes.push(key)
      values.set(key, value)
    },
    async remove(key: string): Promise<void> {
      writes.push(key)
      values.delete(key)
    },
    async clear(): Promise<void> {
      values.clear()
    },
    async keys(): Promise<string[]> {
      return [...values.keys()]
    },
  }
  return Object.assign(provider, { values, writes })
}

/**
 * A model fixture — the contract requires every field, so tests hand the fake
 * transport a real catalog entry.
 *
 * @param overrides - Per-test field overrides.
 * @returns A complete model definition.
 */
function fixtureModel(overrides: Partial<AppModelDefinition> = {}): AppModelDefinition {
  return {
    id: 'test-model',
    provider: 'anthropic',
    label: 'Test',
    description: 'Test model',
    contextWindow: 100_000,
    maxOutputTokens: 8_000,
    supportsThinking: false,
    thinkingBudgetTokens: 0,
    thinkingConfigurable: false,
    supportsVision: false,
    supportsPromptCaching: false,
    supportsTools: true,
    inputPricePerMTok: 1,
    outputPricePerMTok: 5,
    cacheReadPricePerMTok: 0.1,
    cacheWritePricePerMTok: 1.25,
    knowledgeCutoff: '2025-01-01',
    ...overrides,
  }
}

/**
 * A minimal HTTP client whose GET answers one model list.
 *
 * @param models - The `GET /ai/models` body.
 * @returns The client.
 */
function modelClient(models: AppModelDefinition[]): HttpClient {
  const body: ListAIModelsResponse = { models }
  return {
    baseURL: '',
    defaultHeaders: {},
    // `HttpClient.get` is generic: the caller picks `T` (`loadAIModelCatalog`
    // reads the body as `ListAIModelsResponse`), so the fake hands back its one
    // body as that `T`, the way a real transport hands back the parsed JSON.
    get: async <T>(url: string): Promise<HttpResponse<T>> => ({
      data: body as T,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { method: 'GET', url },
    }),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    addRequestInterceptor: vi.fn(() => () => undefined),
    addResponseInterceptor: vi.fn(() => () => undefined),
    addErrorInterceptor: vi.fn(() => () => undefined),
    setAuthToken: vi.fn(),
    getAuthToken: vi.fn(() => null),
    onAuthError: vi.fn(() => () => undefined),
  }
}

/**
 * An editor provider holding a fixed set of tabs, first one active. It builds a
 * fresh array and fresh tab objects on every `getTabs()` call, like a real one.
 *
 * @param paths - The open file paths, first one active.
 * @returns The provider.
 */
function fakeEditor(paths: readonly string[]): EditorProvider {
  return {
    name: 'fake-editor',
    mount: () => {},
    dispose: () => {},
    openFile: () => {},
    closeFile: () => {},
    getContent: () => null,
    setContent: () => {},
    getCursorPosition: () => null,
    setCursorPosition: () => {},
    focus: () => {},
    onChange: () => () => {},
    getTabs: () =>
      paths.map((path, index) => ({
        path,
        label: path,
        isDirty: false,
        isActive: index === 0,
      })),
    setActiveTab: () => {},
    updateConfig: () => {},
  }
}

/**
 * Renders the probe's recorded line from the current DOM.
 *
 * @param fixture - The mounted probe.
 * @returns The rendered line.
 */
function renderedLine(fixture: ComponentFixture<unknown>): string {
  return (
    (fixture.nativeElement.querySelector('[data-line]') as HTMLElement | null)?.textContent ?? ''
  )
}

/**
 * Lets pending promises land, then renders one change detection.
 *
 * @param fixture - The mounted probe.
 */
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  fixture.detectChanges()
}

/**
 * Clicks the probe's switch button.
 *
 * @param fixture - The mounted probe.
 */
function clickSwitch(fixture: ComponentFixture<unknown>): void {
  ;(fixture.nativeElement.querySelector('button') as HTMLButtonElement).click()
}

/**
 * Switches the storage key from `width` to `height` on a click, and renders the
 * key, its value and its ready flag together so a stale first render is visible.
 */
@Component({
  selector: 'app-test-preference-probe',
  template: `
    <button type="button" (click)="switchKey()">switch</button>
    <span data-line>{{ line() }}</span>
  `,
})
class PreferenceProbeComponent {
  readonly key = signal('width')
  private readonly preference = useStoragePreference<number>(this.key, { defaultValue: 0 })

  /**
   * Switches the preferred key.
   */
  switchKey(): void {
    this.key.set('height')
  }

  /**
   * The key, value and readiness the current view shows.
   *
   * @returns The rendered line.
   */
  line(): string {
    return `${this.key()}:${String(this.preference.value())}:${String(this.preference.ready())}`
  }
}

/**
 * Switches the catalog scope from unscoped to `project-1` on a click.
 */
@Component({
  selector: 'app-test-models-probe',
  template: `
    <button type="button" (click)="scopeProject()">scope</button>
    <span data-line>{{ line() }}</span>
  `,
})
class ModelsProbeComponent {
  readonly projectId = signal<string | undefined>(undefined)
  private readonly catalog = useAIModels(this.projectId)

  /**
   * Switches the catalog scope.
   */
  scopeProject(): void {
    this.projectId.set('project-1')
  }

  /**
   * The model ids the current scope shows.
   *
   * @returns The rendered line.
   */
  line(): string {
    return this.catalog
      .models()
      .map((model) => model.id)
      .join(',')
  }
}

/**
 * Records the tab paths of the current provider.
 */
@Component({
  selector: 'app-test-editor-probe',
  template: '<span data-line>{{ line() }}</span>',
})
class EditorProbeComponent {
  private readonly editor = useEditor()

  /**
   * The tab paths the current provider shows.
   *
   * @returns The rendered line.
   */
  line(): string {
    return this.editor
      .tabs()
      .map((tab) => tab.path)
      .join(',')
  }
}

/**
 * Reads one storage key, switchable without remounting the component.
 */
@Component({
  selector: 'app-test-storage-value-probe',
  template: '',
})
class StorageValueProbeComponent {
  readonly key: WritableSignal<string> = signal('a')
  readonly storage = useStorageValue<string>(this.key)
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
  resetAIModelsCache()
  setProvider(syncProvider())
})

describe('useStoragePreference across a key change', () => {
  it('renders the new key, and its unready state, in the first commit', async () => {
    const provider = syncProvider({ width: 320, height: 480 })
    setProvider(provider)
    TestBed.configureTestingModule({
      imports: [PreferenceProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ storage: provider })],
    })
    const fixture = TestBed.createComponent(PreferenceProbeComponent)
    // The synchronous provider answers the very first render already.
    fixture.detectChanges()
    expect(renderedLine(fixture)).toBe('width:320:false')
    await settle(fixture)
    expect(renderedLine(fixture)).toBe('width:320:true')

    clickSwitch(fixture)
    fixture.detectChanges()

    // The new key's stored value is rendered at once, and it is unready from
    // its first render (the previous key had already hydrated).
    expect(renderedLine(fixture)).toBe('height:480:false')
  })
})

describe('useAIModels across a project scope change', () => {
  it('renders from the new scope in the first commit', async () => {
    resetAIModelsCache()
    const http = modelClient([fixtureModel({ id: 'scoped-model' })])
    TestBed.configureTestingModule({
      imports: [ModelsProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ http })],
    })
    const fixture = TestBed.createComponent(ModelsProbeComponent)
    fixture.detectChanges()
    await settle(fixture)
    expect(renderedLine(fixture)).toBe('scoped-model')

    clickSwitch(fixture)
    fixture.detectChanges()

    // The new scope starts empty and loading; the previous scope's catalog is
    // never rendered under a view that reads the new scope.
    expect(renderedLine(fixture)).toBe('')
  })
})

describe('useEditor across a provider replacement', () => {
  it('renders the new provider tabs in the first commit', () => {
    TestBed.configureTestingModule({
      imports: [EditorProbeComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideMolecule({ editor: fakeEditor(['first.ts']) }),
      ],
    })
    const first = TestBed.createComponent(EditorProbeComponent)
    first.detectChanges()
    expect(renderedLine(first)).toBe('first.ts')
    first.destroy()

    // Angular's provider comes from the injector, so "the provider was
    // replaced" is a different provider behind the same token: the consumer
    // created under it reads that provider's tabs at once, never the old
    // provider's. Angular has no way to swap a live injector's token, so the
    // replacement is a fresh module — the closest caller-observable equivalent
    // of React's provider re-render.
    TestBed.resetTestingModule()
    TestBed.configureTestingModule({
      imports: [EditorProbeComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideMolecule({ editor: fakeEditor(['second.ts']) }),
      ],
    })
    const second = TestBed.createComponent(EditorProbeComponent)
    second.detectChanges()

    expect(renderedLine(second)).toBe('second.ts')
  })
})

describe('useStorageValue removeValue', () => {
  it('keeps one identity and removes the key it is showing', async () => {
    const provider = syncProvider({ a: 'one', b: 'two' })
    TestBed.configureTestingModule({
      imports: [StorageValueProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ storage: provider })],
    })
    const fixture = TestBed.createComponent(StorageValueProbeComponent)
    fixture.detectChanges()
    const first = fixture.componentInstance.storage.removeValue

    fixture.componentInstance.key.set('b')
    fixture.detectChanges()

    expect(fixture.componentInstance.storage.removeValue).toBe(first)
    await fixture.componentInstance.storage.removeValue()
    expect(provider.values.has('b')).toBe(false)
    expect(provider.values.has('a')).toBe(true)
  })
})
