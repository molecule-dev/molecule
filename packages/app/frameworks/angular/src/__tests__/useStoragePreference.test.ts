// @vitest-environment jsdom

/**
 * `useStoragePreference` — the component-side subscriber over
 * `getPreferenceStore()`, in Angular's idiom: the hook runs in a component's
 * injection context and every state field is a signal.
 *
 * Locks the consumer contract the dogfood audit found missing:
 *
 * - a synchronous provider is correct on the FIRST render;
 * - an asynchronous provider's hydration CONVERGES on the same component
 *   (no remount, no stuck fallback);
 * - a user edit made BEFORE hydration lands wins over the hydrated snapshot
 *   (the "user-edit-before-hydration" control);
 * - live changes after hydration (another tab, another writer) still apply;
 * - a `null` key is purely local state and writes nothing.
 *
 * @module
 */

import '@angular/compiler'
import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { StorageProvider } from '@molecule/app-storage'
import { setProvider } from '@molecule/app-storage'

import { useStoragePreference, useStorageValue } from '../hooks/use-storage.js'
import { provideMolecule } from '../providers.js'

/**
 * A synchronous provider — the browser localStorage shape.
 *
 * @param initial - The values the provider starts with.
 * @returns The provider, its values, and its per-key remote listeners.
 */
function syncProvider(initial: Record<string, unknown> = {}): StorageProvider & {
  values: Map<string, unknown>
  remoteListeners: Map<string, (value: unknown) => void>
} {
  const values = new Map<string, unknown>(Object.entries(initial))
  const remoteListeners = new Map<string, (value: unknown) => void>()
  const provider: StorageProvider = {
    async get<T = unknown>(key: string): Promise<T | null> {
      return values.has(key) ? (values.get(key) as T) : null
    },
    async set<T = unknown>(key: string, value: T): Promise<void> {
      values.set(key, value)
    },
    async remove(key: string): Promise<void> {
      values.delete(key)
    },
    async clear(): Promise<void> {
      values.clear()
    },
    async keys(): Promise<string[]> {
      return [...values.keys()]
    },
    getSync<T = unknown>(key: string): T | null {
      return values.has(key) ? (values.get(key) as T) : null
    },
    subscribe(key: string, listener: (value: unknown) => void): () => void {
      remoteListeners.set(key, listener)
      return () => remoteListeners.delete(key)
    },
  }
  return Object.assign(provider, { values, remoteListeners })
}

/**
 * An asynchronous provider whose hydration a test resolves by hand — the native
 * / encrypted shape, where the first read lands after the first paint.
 *
 * @param initial - The values the provider starts with.
 * @returns The provider, its values, and a function that answers the oldest
 *   pending batch read.
 */
function deferredProvider(initial: Record<string, unknown> = {}): {
  provider: StorageProvider
  values: Map<string, unknown>
  resolveHydration: (values?: Map<string, unknown | null>) => void
} {
  const values = new Map<string, unknown>(Object.entries(initial))
  const batches: Array<(values: Map<string, unknown | null>) => void> = []
  const provider: StorageProvider = {
    async get<T = unknown>(key: string): Promise<T | null> {
      return values.has(key) ? (values.get(key) as T) : null
    },
    async set<T = unknown>(key: string, value: T): Promise<void> {
      values.set(key, value)
    },
    async remove(key: string): Promise<void> {
      values.delete(key)
    },
    async clear(): Promise<void> {
      values.clear()
    },
    async keys(): Promise<string[]> {
      return [...values.keys()]
    },
    getMany<T = unknown>(_keys: string[]): Promise<Map<string, T | null>> {
      return new Promise<Map<string, T | null>>((resolve) => {
        batches.push((result) => resolve(result as Map<string, T | null>))
      })
    },
  }
  return {
    provider,
    values,
    resolveHydration: (result) => {
      const keys = result ?? new Map<string, unknown | null>(values)
      batches.shift()?.(keys as Map<string, unknown | null>)
    },
  }
}

/**
 * Renders the probe's value and readiness together, so a stuck fallback or a
 * late convergence is visible in one line.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-storage-preference-probe',
  template: '<span data-line>{{ line() }}</span>',
})
class StoragePreferenceProbeComponent {
  readonly preference = useStoragePreference<number>('width', { defaultValue: 280 })

  /**
   * The value and readiness the current view shows.
   *
   * @returns The rendered line.
   */
  line(): string {
    return `${String(this.preference.value())}|${String(this.preference.ready())}`
  }
}

/**
 * A `null` key, with a string default, for the purely-local case.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-storage-preference-null-key-probe',
  template: '',
})
class NullKeyPreferenceProbeComponent {
  readonly preference = useStoragePreference<string>(null, { defaultValue: 'none' })
}

/**
 * The value and actions of `useStorageValue` over the DI-provided provider.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-storage-value-probe',
  template: '',
})
class StorageValueProbeComponent {
  readonly storage = useStorageValue<string>('theme', { defaultValue: 'light' })
}

/**
 * The same, with cross-tab sync requested.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-storage-value-sync-probe',
  template: '',
})
class StorageValueSyncProbeComponent {
  readonly storage = useStorageValue<string>('theme', { defaultValue: 'light', sync: true })
}

/**
 * Renders one change detection of the fixture's current view.
 *
 * @param fixture - The mounted probe.
 */
function render(fixture: ComponentFixture<unknown>): void {
  fixture.detectChanges()
}

/**
 * The probe's rendered line.
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

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
  setProvider(syncProvider())
})

describe('useStoragePreference', () => {
  it('is correct on the first render with a synchronous provider', () => {
    setProvider(syncProvider({ width: 320 }))
    TestBed.configureTestingModule({
      imports: [StoragePreferenceProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({})],
    })

    const fixture = TestBed.createComponent(StoragePreferenceProbeComponent)
    const preference = fixture.componentInstance.preference

    expect(preference.value()).toBe(320)
    expect(preference.setValue).toBeTypeOf('function')
  })

  it('converges an asynchronous hydration WITHOUT a remount', async () => {
    const backend = deferredProvider({ width: 320 })
    setProvider(backend.provider)
    TestBed.configureTestingModule({
      imports: [StoragePreferenceProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({})],
    })

    const fixture = TestBed.createComponent(StoragePreferenceProbeComponent)
    const mounted = fixture.componentInstance
    render(fixture)
    expect(renderedLine(fixture)).toBe('280|false')

    backend.resolveHydration()
    await settle(fixture)

    expect(renderedLine(fixture)).toBe('320|true')
    // Hydration re-rendered the SAME component instance: no remount.
    expect(fixture.componentInstance).toBe(mounted)
  })

  it('keeps a user edit made before hydration, and persists it', async () => {
    const backend = deferredProvider({ width: 320 })
    setProvider(backend.provider)
    TestBed.configureTestingModule({
      imports: [StoragePreferenceProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({})],
    })

    const fixture = TestBed.createComponent(StoragePreferenceProbeComponent)
    const preference = fixture.componentInstance.preference
    expect(preference.value()).toBe(280)

    // The user drags the sidebar before the (slow) backend answers.
    preference.setValue(360)
    expect(preference.value()).toBe(360)

    // The stale snapshot: 320.
    backend.resolveHydration()
    await settle(fixture)

    expect(preference.value()).toBe(360)
    expect(backend.values.get('width')).toBe(360)
  })

  it('applies live changes after hydration (another tab)', async () => {
    const provider = syncProvider({ width: 320 })
    setProvider(provider)
    TestBed.configureTestingModule({
      imports: [StoragePreferenceProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({})],
    })

    const fixture = TestBed.createComponent(StoragePreferenceProbeComponent)
    const preference = fixture.componentInstance.preference
    expect(preference.value()).toBe(320)

    provider.remoteListeners.get('width')?.(400)
    render(fixture)

    expect(preference.value()).toBe(400)
  })

  it('falls back to the default after removeValue', async () => {
    const provider = syncProvider({ width: 320 })
    setProvider(provider)
    TestBed.configureTestingModule({
      imports: [StoragePreferenceProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({})],
    })

    const fixture = TestBed.createComponent(StoragePreferenceProbeComponent)
    const preference = fixture.componentInstance.preference

    preference.removeValue()
    await settle(fixture)

    expect(preference.value()).toBe(280)
    expect(provider.values.has('width')).toBe(false)
  })

  it('supports a functional update', () => {
    setProvider(syncProvider({ width: 320 }))
    TestBed.configureTestingModule({
      imports: [StoragePreferenceProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({})],
    })

    const fixture = TestBed.createComponent(StoragePreferenceProbeComponent)
    const preference = fixture.componentInstance.preference

    preference.setValue((previous) => (previous ?? 280) + 20)

    expect(preference.value()).toBe(340)
  })

  it('persists nothing when the key is null, and reports ready immediately', () => {
    const provider = syncProvider()
    const set = vi.spyOn(provider, 'set')
    setProvider(provider)
    TestBed.configureTestingModule({
      imports: [NullKeyPreferenceProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({})],
    })

    const fixture = TestBed.createComponent(NullKeyPreferenceProbeComponent)
    const preference = fixture.componentInstance.preference

    preference.setValue('typed')

    expect(preference.value()).toBe('typed')
    expect(preference.ready()).toBe(true)
    expect(set).not.toHaveBeenCalled()
  })
})

/**
 * `useStorageValue` (the DI-provided hook) shares the same ordering
 * requirement: its mount read must not replace a value the user already wrote,
 * and cross-tab sync goes through the provider, not the browser global.
 */
describe('useStorageValue', () => {
  /**
   * A provider whose reads the test settles by hand.
   *
   * @returns The provider, its pending reads and its per-key remote listeners.
   */
  function controlledProvider(): {
    provider: StorageProvider
    reads: Array<(value: unknown) => void>
    remoteListeners: Map<string, (value: unknown) => void>
  } {
    const reads: Array<(value: unknown) => void> = []
    const remoteListeners = new Map<string, (value: unknown) => void>()
    const provider: StorageProvider = {
      get<T = unknown>(_key: string): Promise<T | null> {
        return new Promise<T | null>((resolve) => reads.push((value) => resolve(value as T | null)))
      },
      set: vi.fn(async () => {}),
      remove: vi.fn(async () => {}),
      async clear(): Promise<void> {},
      async keys(): Promise<string[]> {
        return []
      },
      subscribe(key: string, listener: (value: unknown) => void): () => void {
        remoteListeners.set(key, listener)
        return () => remoteListeners.delete(key)
      },
    }
    return { provider, reads, remoteListeners }
  }

  it('does not let the initial read overwrite a write made before it landed', async () => {
    const backend = controlledProvider()
    TestBed.configureTestingModule({
      imports: [StorageValueProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ storage: backend.provider })],
    })

    const fixture = TestBed.createComponent(StorageValueProbeComponent)
    const storage = fixture.componentInstance.storage

    await storage.setValue('dark')

    // The slow first read now answers with the value it captured earlier.
    backend.reads.shift()?.('light')
    await settle(fixture)

    expect(storage.value()).toBe('dark')
  })

  it('syncs across tabs through the provider subscription', async () => {
    const backend = controlledProvider()
    TestBed.configureTestingModule({
      imports: [StorageValueSyncProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ storage: backend.provider })],
    })

    const fixture = TestBed.createComponent(StorageValueSyncProbeComponent)
    const storage = fixture.componentInstance.storage

    backend.reads.shift()?.(null)
    await settle(fixture)

    backend.remoteListeners.get('theme')?.('dark')
    await settle(fixture)

    expect(storage.value()).toBe('dark')
  })
})
