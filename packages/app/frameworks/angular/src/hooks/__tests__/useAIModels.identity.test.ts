// @vitest-environment jsdom
/**
 * `useAIModels` reads one empty models list while the catalog loads and after it fails, as React's hook does, so
 * a computed or effect keyed on the list's identity sees no change until the catalog has one.
 *
 * @module
 */

import '@angular/compiler'
import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createFetchClient } from '@molecule/app-http'

import { provideMolecule } from '../../providers.js'
import { resetAIModelsCache, useAIModels } from '../use-ai-models.js'

/**
 * Exposes the hook's signals for the mounted component.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-ai-models-identity-probe',
  template: '',
})
class AIModelsIdentityProbeComponent {
  readonly catalog = useAIModels()
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
  vi.unstubAllGlobals()
})

describe('useAIModels', () => {
  it('keeps one empty models list while the catalog loads and after it fails', async () => {
    resetAIModelsCache()
    let fail: (error: Error) => void = () => undefined
    const fetchMock = vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((_resolve, reject) => {
          fail = reject
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    TestBed.configureTestingModule({
      imports: [AIModelsIdentityProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ http: createFetchClient() })],
    })
    const fixture = TestBed.createComponent(AIModelsIdentityProbeComponent)
    fixture.detectChanges()
    const catalog = fixture.componentInstance.catalog
    const first = catalog.models()
    expect(catalog.models()).toBe(first)

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    fail(new Error('boom'))
    await vi.waitFor(() => expect(catalog.loading()).toBe(false))
    fixture.detectChanges()
    expect(catalog.models()).toBe(first)
  })

  it('gives two callers on one scope the same empty models list while the catalog loads', async () => {
    resetAIModelsCache()
    let fail: (error: Error) => void = () => undefined
    const fetchMock = vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((_resolve, reject) => {
          fail = reject
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    TestBed.configureTestingModule({
      imports: [AIModelsIdentityProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ http: createFetchClient() })],
    })
    const first = TestBed.createComponent(AIModelsIdentityProbeComponent)
    const second = TestBed.createComponent(AIModelsIdentityProbeComponent)
    first.detectChanges()
    second.detectChanges()
    expect(first.componentInstance.catalog.loading()).toBe(true)
    expect(second.componentInstance.catalog.models()).toBe(first.componentInstance.catalog.models())

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    fail(new Error('boom'))
    await vi.waitFor(() => expect(first.componentInstance.catalog.loading()).toBe(false))
  })
})
