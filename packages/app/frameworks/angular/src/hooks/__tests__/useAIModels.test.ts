// @vitest-environment jsdom

/**
 * `useAIModels` — one catalog fetch per scope, shared through the module-level
 * cache, with loading, the free-tier pick and the fetch error as signals.
 * Angular's idiom for React's hook over the DI-provided HTTP client.
 *
 * @module
 */

import '@angular/compiler'
import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppModelDefinition } from '@molecule/app-ai-models'
import type { HttpClient, HttpResponse } from '@molecule/app-http'

import { provideMolecule } from '../../providers.js'
import { resetAIModelsCache, useAIModels } from '../use-ai-models.js'

/**
 * Builds an `AppModelDefinition` fixture with sensible defaults.
 *
 * @param overrides - Fields to override on the default model.
 * @returns The merged fixture model.
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
 * Builds a minimal `HttpClient` that returns the given models from `.get`.
 *
 * @param models - Models to return as the response body of `/ai/models`.
 * @returns The fake client and the spy for inspecting calls.
 */
function makeClient(models: AppModelDefinition[]): {
  client: HttpClient
  get: ReturnType<typeof vi.fn>
} {
  const get = vi.fn<(url: string) => void>()
  const client: HttpClient = {
    baseURL: '',
    defaultHeaders: {},
    get: async <T = unknown>(url: string): Promise<HttpResponse<T>> => {
      get(url)
      return {
        data: { models } as T,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { method: 'GET', url },
      }
    },
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
  return { client, get }
}

/**
 * Builds a client whose GET fails with `boom`.
 *
 * @returns The failing client.
 */
function failingClient(): HttpClient {
  return {
    baseURL: '',
    defaultHeaders: {},
    get: vi.fn(async () => {
      throw new Error('boom')
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
 * Exposes the hook's signals for the mounted component.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-ai-models-probe',
  template: '',
})
class AIModelsProbeComponent {
  readonly catalog = useAIModels()
}

/**
 * Lets pending promises land and renders one change detection.
 *
 * @param fixture - The mounted probe.
 */
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  fixture.detectChanges()
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

beforeEach(() => {
  resetAIModelsCache()
})

afterEach(() => {
  TestBed.resetTestingModule()
  resetAIModelsCache()
})

describe('useAIModels', () => {
  it('returns loading=true and empty models on first render', () => {
    const { client } = makeClient([fixtureModel()])
    TestBed.configureTestingModule({
      imports: [AIModelsProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ http: client })],
    })
    const fixture = TestBed.createComponent(AIModelsProbeComponent)
    fixture.detectChanges()
    const catalog = fixture.componentInstance.catalog

    expect(catalog.loading()).toBe(true)
    expect(catalog.models()).toEqual([])
  })

  it('resolves with the fetched models', async () => {
    const models = [fixtureModel({ id: 'a' }), fixtureModel({ id: 'b', freeTier: true })]
    const { client } = makeClient(models)
    TestBed.configureTestingModule({
      imports: [AIModelsProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ http: client })],
    })
    const fixture = TestBed.createComponent(AIModelsProbeComponent)
    fixture.detectChanges()
    const catalog = fixture.componentInstance.catalog

    await settle(fixture)

    expect(catalog.loading()).toBe(false)
    expect(catalog.models()).toEqual(models)
    expect(catalog.freeTierModel()?.id).toBe('b')
    expect(catalog.error()).toBeNull()
  })

  it('fetches only once across multiple mounts', async () => {
    const { client, get } = makeClient([fixtureModel()])
    TestBed.configureTestingModule({
      imports: [AIModelsProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ http: client })],
    })
    const first = TestBed.createComponent(AIModelsProbeComponent)
    first.detectChanges()
    while (first.componentInstance.catalog.loading()) await settle(first)
    first.destroy()

    const second = TestBed.createComponent(AIModelsProbeComponent)
    second.detectChanges()

    expect(second.componentInstance.catalog.loading()).toBe(false)
    expect(second.componentInstance.catalog.models()).toHaveLength(1)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('surfaces fetch errors', async () => {
    TestBed.configureTestingModule({
      imports: [AIModelsProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ http: failingClient() })],
    })
    const fixture = TestBed.createComponent(AIModelsProbeComponent)
    fixture.detectChanges()
    const catalog = fixture.componentInstance.catalog

    await settle(fixture)

    expect(catalog.loading()).toBe(false)
    expect(catalog.error()?.message).toBe('boom')
    expect(catalog.models()).toEqual([])
  })
})
