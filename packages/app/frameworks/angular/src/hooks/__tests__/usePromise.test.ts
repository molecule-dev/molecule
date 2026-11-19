// @vitest-environment jsdom

/**
 * `usePromise` — the state of the latest call of an async function, held in a
 * tuple whose state member is updated in place. Every title is React's
 * (`usePromise.test.ts`); only the framework-forced mechanics change: the
 * function runs in an injection context (a component field initializer), and
 * `fixture.destroy()` replaces unmounting a hook.
 *
 * @module
 */

import '@angular/compiler'
import { Component, provideZonelessChangeDetection } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePromise } from '../use-async.js'

/** The async function the probe wraps; each case replaces it before mounting. */
let asyncCall: (id?: string) => Promise<unknown> = async () => null

/** Exposes the hook's tuple for the mounted component. */
@Component({
  selector: 'app-test-promise-probe',
  template: '',
})
class PromiseProbeComponent {
  readonly promise = usePromise<unknown, [id?: string]>(asyncCall)
}

/** Lets every pending promise chain run. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Mounts the probe against the current async function.
 *
 * @returns The mounted fixture.
 */
function mount(): ComponentFixture<PromiseProbeComponent> {
  TestBed.resetTestingModule()
  TestBed.configureTestingModule({
    imports: [PromiseProbeComponent],
    providers: [provideZonelessChangeDetection()],
  })
  const fixture = TestBed.createComponent(PromiseProbeComponent)
  fixture.detectChanges()
  return fixture
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

beforeEach(() => {
  asyncCall = async () => null
})

afterEach(() => {
  TestBed.resetTestingModule()
})

describe('usePromise', () => {
  it('cancel sets status to rejected with error message', async () => {
    let resolveFn!: (value: string) => void
    asyncCall = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFn = resolve
        }),
    )

    const fixture = mount()
    const [state, call] = fixture.componentInstance.promise

    void call()

    expect(state.status).toBe('pending')

    state.cancel('User cancelled')

    expect(state.status).toBe('rejected')
    expect(state.error).toBeInstanceOf(Error)
    expect(state.error?.message).toBe('User cancelled')

    // Resolve should be ignored after cancel
    resolveFn('should be ignored')
    await settle()

    expect(state.status).toBe('rejected')
    expect(state.value).toBeNull()
  })

  it('cancel without message sets rejected with null error', () => {
    asyncCall = vi.fn(() => new Promise<string>(() => {}))

    const fixture = mount()
    const [state, call] = fixture.componentInstance.promise

    void call()

    state.cancel()

    expect(state.status).toBe('rejected')
    expect(state.error).toBeNull()
  })

  it('reset clears state back to idle', async () => {
    asyncCall = vi.fn(() => Promise.resolve('data'))

    const fixture = mount()
    const [state, call] = fixture.componentInstance.promise

    await call()

    expect(state.status).toBe('resolved')
    expect(state.value).toBe('data')

    state.reset()

    expect(state.status).toBe('idle')
    expect(state.value).toBeNull()
    expect(state.error).toBeNull()
  })

  it('multiple calls - only latest result is used (stale calls ignored)', async () => {
    const resolvers: Array<(value: string) => void> = []
    asyncCall = vi.fn(
      (_id?: string) =>
        new Promise<string>((resolve) => {
          resolvers.push(resolve)
        }),
    )

    const fixture = mount()
    const [state, call] = fixture.componentInstance.promise

    // Start first call
    void call('first')

    // Start second call (should make first stale)
    const promise2 = call('second')

    expect(state.status).toBe('pending')

    // Resolve the first call - should be ignored since it's stale
    resolvers[0]('first-result')
    await settle()

    // Value should still be null because first call is stale
    expect(state.value).toBeNull()
    expect(state.status).toBe('pending')

    // Resolve the second call - should be applied
    resolvers[1]('second-result')
    await promise2

    expect(state.status).toBe('resolved')
    expect(state.value).toBe('second-result')
  })

  it('unmount prevents state updates', async () => {
    let resolveFn!: (value: string) => void
    asyncCall = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFn = resolve
        }),
    )

    const fixture = mount()
    const [state, call] = fixture.componentInstance.promise

    void call()

    expect(state.status).toBe('pending')

    // Destroy the component (React's unmount)
    fixture.destroy()

    // Resolve after unmount - should not throw or update state
    resolveFn('after unmount')
    await settle()

    // State should still be pending (no update after unmount)
    expect(state.status).toBe('pending')
  })

  it('returns the resolved value from the wrapped function', async () => {
    asyncCall = vi.fn(() => Promise.resolve(42))

    const fixture = mount()
    const [, call] = fixture.componentInstance.promise

    const returnedValue = await call()

    expect(returnedValue).toBe(42)
  })
})
