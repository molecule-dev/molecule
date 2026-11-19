// @vitest-environment jsdom

/**
 * `useCapacitorApp` — the coordinator's state as signals, initializing on
 * mount and destroying on unmount. Angular's idiom for React's hook: the
 * framework lifecycle is the component's, so "mount" is component creation and
 * "unmount" is `fixture.destroy()`.
 *
 * @module
 */

import '@angular/compiler'
import { Component, provideZonelessChangeDetection } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CapacitorAppState } from '@molecule/app-platform'

import { useCapacitorApp } from '../use-native.js'

type StateCallback = (state: CapacitorAppState) => void

/**
 * A coordinator stand-in whose state the test emits by hand.
 *
 * @returns The fake coordinator.
 */
const createMockApp = () => {
  const subscribers = new Set<StateCallback>()
  let state: CapacitorAppState = {
    ready: false,
    deviceReady: false,
    pushReady: true,
    error: null,
  }

  return {
    initialize: vi.fn(async () => {}),
    isReady: vi.fn(() => state.ready),
    getState: vi.fn(() => state),
    subscribe: vi.fn((callback: StateCallback) => {
      subscribers.add(callback)
      return () => {
        subscribers.delete(callback)
      }
    }),
    onReady: vi.fn(() => () => {}),
    destroy: vi.fn(),
    /**
     * Pushes a state change to every subscriber, as the coordinator would.
     *
     * @param partial - The fields that changed.
     */
    emit(partial: Partial<CapacitorAppState>): void {
      state = { ...state, ...partial }
      for (const callback of subscribers) callback(state)
    },
  }
}

let mockApp: ReturnType<typeof createMockApp>

vi.mock('@molecule/app-platform', () => ({
  createCapacitorApp: vi.fn(() => mockApp),
}))

/**
 * Exposes the hook's signals for the mounted component.
 */
@Component({
  selector: 'app-test-capacitor-app-probe',
  template: '',
})
class CapacitorAppProbeComponent {
  readonly app = useCapacitorApp()
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

beforeEach(() => {
  mockApp = createMockApp()
})

afterEach(() => {
  TestBed.resetTestingModule()
})

/**
 * Mounts the probe against the current mock coordinator.
 *
 * @returns The mounted fixture.
 */
function mount(): ComponentFixture<CapacitorAppProbeComponent> {
  TestBed.configureTestingModule({
    imports: [CapacitorAppProbeComponent],
    providers: [provideZonelessChangeDetection()],
  })
  const fixture = TestBed.createComponent(CapacitorAppProbeComponent)
  fixture.detectChanges()
  return fixture
}

describe('useCapacitorApp', () => {
  it('returns initial state with ready=false', () => {
    const fixture = mount()
    const app = fixture.componentInstance.app

    expect(app.ready()).toBe(false)
    expect(app.deviceReady()).toBe(false)
    expect(app.pushReady()).toBe(true)
    expect(app.error()).toBe(null)
    expect(typeof app.initialize).toBe('function')
  })

  it('auto-initializes on mount', async () => {
    mount()

    await vi.waitFor(() => {
      expect(mockApp.initialize).toHaveBeenCalledOnce()
    })
  })

  it('updates state when app becomes ready', () => {
    const fixture = mount()
    const app = fixture.componentInstance.app

    expect(app.ready()).toBe(false)

    // The coordinator pushes a state update through its subscription.
    mockApp.emit({
      ready: true,
      deviceReady: true,
      pushReady: true,
      error: null,
    })

    expect(app.ready()).toBe(true)
    expect(app.deviceReady()).toBe(true)
  })

  it('cleans up on unmount by calling destroy', () => {
    const fixture = mount()

    expect(mockApp.destroy).not.toHaveBeenCalled()

    fixture.destroy()

    expect(mockApp.destroy).toHaveBeenCalledOnce()
  })
})
