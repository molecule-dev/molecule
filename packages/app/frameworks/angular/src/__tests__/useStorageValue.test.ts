// @vitest-environment jsdom

/**
 * `useStorageValue` keeps `loading` and `value` true to the key it was given:
 * a write that lands before the first read still ends the loading state, a new
 * key starts over, and an object `defaultValue` does not re-read on every
 * render — Angular's idiom for React's hook over the DI-provided provider.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { StorageProvider } from '@molecule/app-storage'

import { useStorageValue } from '../hooks/use-storage.js'
import { provideMolecule } from '../providers.js'

/**
 * A storage provider whose reads stay pending until the test answers them.
 *
 * @param contents - What a read answers with, per key.
 * @returns The provider, its read spy and a function that answers the oldest
 *   pending read.
 */
function heldStorage(contents: Record<string, unknown> = {}): {
  provider: StorageProvider
  get: ReturnType<typeof vi.fn>
  answer: (fixture: ComponentFixture<unknown>) => Promise<void>
} {
  const values = new Map(Object.entries(contents))
  const pending: Array<() => void> = []
  const get = vi.fn<(key: string) => void>()
  const provider: StorageProvider = {
    get<T = unknown>(key: string): Promise<T | null> {
      get(key)
      return new Promise<T | null>((resolve) => {
        pending.push(() => resolve((values.has(key) ? values.get(key) : null) as T | null))
      })
    },
    set: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value)
    }),
    remove: vi.fn(async (key: string) => {
      values.delete(key)
    }),
    clear: vi.fn(async () => values.clear()),
    keys: vi.fn(async () => [...values.keys()]),
  }
  const answer = async (fixture: ComponentFixture<unknown>): Promise<void> => {
    pending.shift()?.()
    await new Promise((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()
  }
  return { provider, get, answer }
}

/**
 * Reads the `theme` key with a string default; the write-before-read case.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-storage-value-theme-probe',
  template: '',
})
class StorageValueThemeProbeComponent {
  readonly storage = useStorageValue<string>('theme', { defaultValue: 'x' })
}

/**
 * Reads a switchable key, so a new key can start over on the same component.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-storage-value-key-probe',
  template: '',
})
class StorageValueKeyProbeComponent {
  readonly key = signal('a')
  readonly storage = useStorageValue<string>(this.key, { defaultValue: 'default' })
}

/**
 * Reads a key whose default is written inline as an object.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-storage-value-object-probe',
  template: '',
})
class StorageValueObjectProbeComponent {
  readonly storage = useStorageValue<{ size: number }>('prefs', { defaultValue: { size: 1 } })
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
})

describe('useStorageValue', () => {
  it('ends loading when a write lands before the first read, keeping the written value', async () => {
    const storage = heldStorage({ theme: 'light' })
    TestBed.configureTestingModule({
      imports: [StorageValueThemeProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ storage: storage.provider })],
    })
    const fixture = TestBed.createComponent(StorageValueThemeProbeComponent)
    const value = fixture.componentInstance.storage
    expect(value.loading()).toBe(true)

    await value.setValue('dark')
    await storage.answer(fixture)

    expect(value.value()).toBe('dark')
    expect(value.loading()).toBe(false)
    expect(value.error()).toBeNull()
  })

  it('starts over when the key changes', async () => {
    const storage = heldStorage({ a: 'value of a', b: 'value of b' })
    TestBed.configureTestingModule({
      imports: [StorageValueKeyProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ storage: storage.provider })],
    })
    const fixture = TestBed.createComponent(StorageValueKeyProbeComponent)
    const value = fixture.componentInstance.storage
    await storage.answer(fixture)
    expect(value.value()).toBe('value of a')
    expect(value.loading()).toBe(false)

    fixture.componentInstance.key.set('b')
    fixture.detectChanges()
    expect(value.value()).toBe('default')
    expect(value.loading()).toBe(true)

    await storage.answer(fixture)
    expect(value.value()).toBe('value of b')
    expect(value.loading()).toBe(false)
  })

  it('reads once for an object defaultValue written inline', async () => {
    const storage = heldStorage()
    TestBed.configureTestingModule({
      imports: [StorageValueObjectProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ storage: storage.provider })],
    })
    const fixture = TestBed.createComponent(StorageValueObjectProbeComponent)
    const value = fixture.componentInstance.storage
    await storage.answer(fixture)
    expect(value.loading()).toBe(false)
    fixture.detectChanges()
    fixture.detectChanges()

    expect(value.value()).toEqual({ size: 1 })
    expect(storage.get).toHaveBeenCalledTimes(1)
  })
})
