// @vitest-environment jsdom

/**
 * Angular port of React's `useVersion.test.ts`. Every title is React's; the
 * framework-forced mechanics change: the hook is called once in an injection
 * context (a component field initializer) instead of on every render, a
 * subscription lives on the component's `DestroyRef` instead of a
 * `useEffect` cleanup, and a signal read replaces reading the returned object
 * on a re-render. React's `rerender()` becomes an explicit change-detection
 * pass, and `unmount()` becomes `fixture.destroy()`.
 *
 * @module
 */

import '@angular/compiler'
import { Component, provideZonelessChangeDetection } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  UpdateCheckOptions,
  VersionEvent,
  VersionProvider,
  VersionState,
} from '@molecule/app-version'

vi.mock('@molecule/app-version', () => ({
  getProvider: vi.fn(),
}))

import { getProvider } from '@molecule/app-version'

import { useVersion } from '../use-version.js'

/** The provider plus the two controls the test drives directly. */
interface MockVersionProvider extends VersionProvider {
  /** Replaces the state the next `getState()` reports. */
  readonly _setState: (partial: Partial<VersionState>) => void
  /** Fires one subscription's handler. */
  readonly _emit: (event: VersionEvent) => void
}

/**
 * Builds a typed version provider whose `on` records live handlers.
 *
 * @param initialState - Fields that override the default state.
 * @returns The provider mock.
 */
const createMockProvider = (initialState?: Partial<VersionState>): MockVersionProvider => {
  let state: VersionState = {
    buildId: 'abc123',
    version: '1.0.0',
    isUpdateAvailable: false,
    isServiceWorkerWaiting: false,
    isChecking: false,
    ...initialState,
  }

  const listeners = new Map<VersionEvent, Set<() => void>>()

  return {
    getState: () => ({ ...state }),
    setCurrentVersion: vi.fn(),
    checkForUpdates: vi.fn(async () => {
      state = { ...state, isChecking: true }
      listeners.get('check-start')?.forEach((fn) => fn())
      state = { ...state, isChecking: false }
      listeners.get('check-complete')?.forEach((fn) => fn())
      return false
    }),
    startPeriodicChecks: vi.fn(),
    stopPeriodicChecks: vi.fn(),
    getServiceWorker: vi.fn(),
    applyUpdate: vi.fn(),
    dismissUpdate: vi.fn(() => {
      state = { ...state, isUpdateAvailable: false }
    }),
    on: vi.fn((event: VersionEvent, handler: () => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)!.add(handler)
      return () => {
        listeners.get(event)?.delete(handler)
      }
    }),
    off: vi.fn(),
    destroy: vi.fn(),
    _setState: (partial: Partial<VersionState>) => {
      state = { ...state, ...partial }
    },
    _emit: (event: VersionEvent) => {
      listeners.get(event)?.forEach((fn) => fn())
    },
  }
}

/** The probe every case mounts: it reads `useVersion` like a component does. */
@Component({ selector: 'app-test-version-probe', template: '' })
class VersionProbe {
  readonly version = useVersion()
}

/**
 * Mounts the probe and renders it once.
 *
 * @returns The mounted fixture.
 */
function mountVersion(): ComponentFixture<VersionProbe> {
  TestBed.configureTestingModule({
    imports: [VersionProbe],
    providers: [provideZonelessChangeDetection()],
  })
  const fixture = TestBed.createComponent(VersionProbe)
  fixture.detectChanges()
  return fixture
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

describe('useVersion', () => {
  let mockProvider: MockVersionProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    vi.mocked(getProvider).mockReturnValue(mockProvider)
  })

  it('subscribes to all 6 version events', () => {
    mountVersion()

    const onCalls = vi.mocked(mockProvider.on).mock.calls
    const subscribedEvents = onCalls.map(([event]) => event)

    expect(subscribedEvents).toContain('update-available')
    expect(subscribedEvents).toContain('service-worker-waiting')
    expect(subscribedEvents).toContain('service-worker-activated')
    expect(subscribedEvents).toContain('check-start')
    expect(subscribedEvents).toContain('check-complete')
    expect(subscribedEvents).toContain('check-error')
    expect(onCalls).toHaveLength(6)
  })

  it('updates state when events fire', () => {
    const fixture = mountVersion()
    const { version } = fixture.componentInstance

    expect(version.isUpdateAvailable()).toBe(false)

    mockProvider._setState({
      isUpdateAvailable: true,
      newVersion: '2.0.0',
    })
    mockProvider._emit('update-available')

    expect(version.isUpdateAvailable()).toBe(true)
    expect(version.newVersion()).toBe('2.0.0')
  })

  it('caches snapshot for referential stability', () => {
    const fixture = mountVersion()

    const firstState = fixture.componentInstance.version.state()
    fixture.detectChanges()
    const secondState = fixture.componentInstance.version.state()

    // Same reference since nothing changed
    expect(firstState).toBe(secondState)
  })

  it('delegates checkForUpdates to provider', async () => {
    const fixture = mountVersion()

    await fixture.componentInstance.version.checkForUpdates()

    expect(mockProvider.checkForUpdates).toHaveBeenCalledOnce()
  })

  it('delegates applyUpdate to provider', () => {
    const fixture = mountVersion()

    fixture.componentInstance.version.applyUpdate({ force: true })

    expect(mockProvider.applyUpdate).toHaveBeenCalledWith({ force: true })
  })

  it('delegates dismissUpdate to provider', () => {
    const fixture = mountVersion()

    fixture.componentInstance.version.dismissUpdate()

    expect(mockProvider.dismissUpdate).toHaveBeenCalledOnce()
  })

  it('delegates startPeriodicChecks to provider', () => {
    const fixture = mountVersion()
    const options: UpdateCheckOptions = { interval: 30000, immediate: true }

    fixture.componentInstance.version.startPeriodicChecks(options)

    expect(mockProvider.startPeriodicChecks).toHaveBeenCalledWith({
      interval: 30000,
      immediate: true,
    })
  })

  it('delegates stopPeriodicChecks to provider', () => {
    const fixture = mountVersion()

    fixture.componentInstance.version.stopPeriodicChecks()

    expect(mockProvider.stopPeriodicChecks).toHaveBeenCalledOnce()
  })

  it('unsubscribes from all events on unmount', () => {
    const unsubFns = Array.from({ length: 6 }, () => vi.fn())
    let callIndex = 0
    vi.mocked(mockProvider.on).mockImplementation(() => {
      const unsub = unsubFns[callIndex]
      callIndex++
      return unsub
    })

    const fixture = mountVersion()

    unsubFns.forEach((fn) => expect(fn).not.toHaveBeenCalled())

    fixture.destroy()

    unsubFns.forEach((fn) => expect(fn).toHaveBeenCalledOnce())
  })
})
