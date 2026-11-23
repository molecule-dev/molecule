// @vitest-environment jsdom

/**
 * `useOptimisticValue` — a server-backed value that changes on the first read
 * after a tap and is saved one change at a time, in order. Every title is
 * React's (`useOptimisticValue.test.ts`); only the framework-forced mechanics
 * change: the function runs in an injection context (a component field
 * initializer) instead of a hook, the result's fields are signals read with
 * `()`, `detectChanges()` replaces a render, and a signal argument replaces
 * React's re-render with new props. React-only machinery (StrictMode's
 * double render, a discarded render, layout-effect ordering inside React's
 * commit) has no counterpart, so those cases pin what a caller observes under
 * it: no duplicate save, and the newest rendered save adapter.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  Input,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { OptimisticValueOptions } from '@molecule/app-state'

import { useOptimisticValue, type UseOptimisticValueResult } from '../use-async.js'

interface Favorite {
  favorited: boolean
  count: number
}

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

/**
 * A promise whose settlement the case controls.
 *
 * @returns The pending reply.
 */
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** One outstanding save's request and answer. */
interface ServerCall {
  next: Favorite
  reply: Deferred<Favorite>
}

/** A server whose saves finish when the case says so. */
interface ManualServer {
  calls: ServerCall[]
  commit: (next: Favorite) => Promise<Favorite>
}

/**
 * Creates a save adapter whose answers the case supplies.
 *
 * @returns The recorded calls and the commit function.
 */
function manualServer(): ManualServer {
  const calls: ServerCall[] = []
  const commit = vi.fn((next: Favorite) => {
    const reply = deferred<Favorite>()
    calls.push({ next, reply })
    return reply.promise
  })
  return { calls, commit }
}

/**
 * Whether two favorites are the same change.
 *
 * @param a - One favorite.
 * @param b - The other favorite.
 * @returns Whether they carry the same flag and count.
 */
function equalsFavorite(a: Favorite, b: Favorite): boolean {
  return a.favorited === b.favorited && a.count === b.count
}

/** The server snapshot and save adapter the favorite button is rendered with. */
const favoriteOptions = signal<OptimisticValueOptions<Favorite>>({
  value: { favorited: false, count: 2 },
  equals: equalsFavorite,
  commit: async (next) => next,
})

/** A favorite button rendered with the app's own markup, like React's. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-favorite-button',
  template: `<button
    type="button"
    [attr.aria-pressed]="favorite.value().favorited"
    [attr.data-pending]="favorite.pending()"
    [attr.data-error]="errorLabel()"
    (click)="tap()"
  >
    {{ favorite.value().count }}
  </button>`,
})
class FavoriteButtonComponent {
  readonly favorite: UseOptimisticValueResult<Favorite> =
    useOptimisticValue<Favorite>(favoriteOptions)

  readonly errorLabel = computed(() => {
    const error = this.favorite.error()
    return error ? String(error) : ''
  })

  /** Flips the flag and moves the count, exactly as the React case does. */
  tap(): void {
    this.favorite.update((current) => ({
      favorited: !current.favorited,
      count: current.count + (current.favorited ? -1 : 1),
    }))
  }
}

/** The quantity controller the number probes are created with. */
const quantityOptions = signal<OptimisticValueOptions<number>>({
  value: 1,
  commit: async (next) => next,
})

/** A quantity controller with no markup, like React's `renderHook`. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-quantity-probe',
  template: '',
})
class QuantityProbeComponent {
  readonly quantity: UseOptimisticValueResult<number> = useOptimisticValue<number>(quantityOptions)
}

/** The boolean controller the boolean probe is created with. */
const booleanOptions = signal<OptimisticValueOptions<boolean>>({
  value: false,
  commit: async (next) => next,
})

/** A boolean controller with no markup, like React's `renderHook`. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-boolean-probe',
  template: '',
})
class BooleanProbeComponent {
  readonly value: UseOptimisticValueResult<boolean> = useOptimisticValue<boolean>(booleanOptions)
}

/** A record with two fields, like the multi-request save React's case uses. */
interface Flags {
  first: boolean
  second: boolean
}

/** The two-field controller the flags probe is created with. */
const flagsOptions = signal<OptimisticValueOptions<Flags>>({
  value: { first: false, second: false },
  commit: async () => undefined,
})

/** A two-field controller with no markup, like React's `renderHook`. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-flags-probe',
  template: '',
})
class FlagsProbeComponent {
  readonly state: UseOptimisticValueResult<Flags> = useOptimisticValue<Flags>(flagsOptions)
}

/** The number controller the layout probes are created with. */
const layoutOptions = signal<OptimisticValueOptions<number>>({
  value: 1,
  commit: async (next) => next,
})

/** Whether the same-component layout probe acts on the committed adapter. */
const layoutActive = signal(false)

/** A probe whose own effect makes a change, like React's `useLayoutEffect`. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-layout-probe',
  template: '',
})
class LayoutProbeComponent {
  readonly state: UseOptimisticValueResult<number> = useOptimisticValue<number>(layoutOptions)

  constructor() {
    effect(() => {
      if (layoutActive()) this.state.set(2)
    })
  }
}

/** A child whose effect makes a change through the parent's exposed `set`. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-layout-child',
  template: '',
})
class LayoutChildComponent {
  /** The parent's `set`, bound before the case flips the shared active signal. */
  @Input() setter: (next: number) => void = () => {}

  constructor() {
    effect(() => {
      if (layoutActive()) this.setter(2)
    })
  }
}

/** A parent that owns the value and hands `set` to a descendant. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-layout-parent',
  template: '<app-test-layout-child [setter]="state.set" />',
  imports: [LayoutChildComponent],
})
class LayoutParentComponent {
  readonly state: UseOptimisticValueResult<number> = useOptimisticValue<number>(layoutOptions)
}

/** The favorite controller the StrictMode case is created with. */
const strictOptions = signal<OptimisticValueOptions<Favorite>>({
  value: { favorited: false, count: 2 },
  equals: equalsFavorite,
  commit: async (next) => next,
})

/** A favorite controller re-rendered with an inline comparator, like React's StrictMode case. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-strict-probe',
  template: '',
})
class StrictProbeComponent {
  readonly state: UseOptimisticValueResult<Favorite> = useOptimisticValue<Favorite>(strictOptions)
}

/**
 * Mounts one probe component and renders it once.
 *
 * @param component - The component class.
 * @returns The mounted fixture.
 */
function mount<T>(component: new () => T): ComponentFixture<T> {
  TestBed.resetTestingModule()
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection()],
  })
  const fixture = TestBed.createComponent(component)
  fixture.detectChanges()
  return fixture
}

/**
 * The one button in the fixture's DOM.
 *
 * @param fixture - The mounted fixture.
 * @returns The button element.
 */
function button(fixture: ComponentFixture<unknown>): HTMLButtonElement {
  const element = fixture.nativeElement.querySelector('button') as HTMLButtonElement | null
  if (!element) throw new Error('no button rendered')
  return element
}

/**
 * The label the button shows, without template whitespace.
 *
 * @param control - The rendered button.
 * @returns The label text.
 */
function label(control: HTMLElement): string {
  return (control.textContent ?? '').trim()
}

/** Lets every pending promise chain and queued change run. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * The controller state as a plain object for `toMatchObject`.
 *
 * @param state - The controller's result.
 * @returns Its current value, pending flag and error.
 */
function snapshot<T>(state: UseOptimisticValueResult<T>): {
  value: T
  pending: boolean
  error: unknown
} {
  return { value: state.value(), pending: state.pending(), error: state.error() }
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

beforeEach(() => {
  favoriteOptions.set({
    value: { favorited: false, count: 2 },
    equals: equalsFavorite,
    commit: async (next) => next,
  })
  quantityOptions.set({ value: 1, commit: async (next) => next })
  booleanOptions.set({ value: false, commit: async (next) => next })
  flagsOptions.set({ value: { first: false, second: false }, commit: async () => undefined })
  layoutOptions.set({ value: 1, commit: async (next) => next })
  layoutActive.set(false)
  strictOptions.set({
    value: { favorited: false, count: 2 },
    equals: equalsFavorite,
    commit: async (next) => next,
  })
})

afterEach(() => {
  TestBed.resetTestingModule()
})

describe('useOptimisticValue', () => {
  it('saves a second tap made while the first save is still running', async () => {
    const server = manualServer()
    favoriteOptions.set({
      value: { favorited: false, count: 2 },
      equals: equalsFavorite,
      commit: server.commit,
    })
    const fixture = mount(FavoriteButtonComponent)
    const control = button(fixture)

    control.click()
    fixture.detectChanges()
    expect(control.getAttribute('aria-pressed')).toBe('true')
    expect(label(control)).toBe('3')
    control.click()
    fixture.detectChanges()
    expect(control.getAttribute('aria-pressed')).toBe('false')
    expect(label(control)).toBe('2')
    expect(server.calls).toHaveLength(1)

    server.calls[0].reply.resolve({ favorited: true, count: 3 })
    await settle()
    fixture.detectChanges()
    expect(server.calls.map((call) => call.next.favorited)).toEqual([true, false])
    expect(control.getAttribute('aria-pressed')).toBe('false')

    server.calls[1].reply.resolve({ favorited: false, count: 2 })
    await settle()
    fixture.detectChanges()
    expect(control.getAttribute('data-pending')).toBe('false')
    expect(label(control)).toBe('2')
  })

  it('keeps the saved value when the parent re-renders with the props it loaded first', async () => {
    const server = manualServer()
    const loaded = { favorited: false, count: 2 }
    favoriteOptions.set({ value: loaded, equals: equalsFavorite, commit: server.commit })
    const fixture = mount(FavoriteButtonComponent)
    const control = button(fixture)

    control.click()
    fixture.detectChanges()
    server.calls[0].reply.resolve({ favorited: true, count: 3 })
    await settle()
    fixture.detectChanges()

    // The parent re-renders with the props it loaded first.
    favoriteOptions.set({
      value: { favorited: false, count: 2 },
      equals: equalsFavorite,
      commit: server.commit,
    })
    fixture.detectChanges()
    await settle()
    fixture.detectChanges()

    expect(control.getAttribute('aria-pressed')).toBe('true')
    expect(label(control)).toBe('3')
  })

  it('shows a refetched value when nothing is being saved', async () => {
    const server = manualServer()
    favoriteOptions.set({
      value: { favorited: false, count: 2 },
      equals: equalsFavorite,
      commit: server.commit,
    })
    const fixture = mount(FavoriteButtonComponent)
    const control = button(fixture)

    favoriteOptions.set({
      value: { favorited: true, count: 9 },
      equals: equalsFavorite,
      commit: server.commit,
    })
    fixture.detectChanges()
    await settle()
    fixture.detectChanges()

    expect(control.getAttribute('aria-pressed')).toBe('true')
    expect(label(control)).toBe('9')
    expect(server.commit).not.toHaveBeenCalled()
  })

  it('keeps the tap during a save when a refetch arrives, and falls back to it on failure', async () => {
    const server = manualServer()
    favoriteOptions.set({
      value: { favorited: false, count: 2 },
      equals: equalsFavorite,
      commit: server.commit,
    })
    const fixture = mount(FavoriteButtonComponent)
    const control = button(fixture)

    control.click()
    fixture.detectChanges()

    favoriteOptions.set({
      value: { favorited: false, count: 5 },
      equals: equalsFavorite,
      commit: server.commit,
    })
    fixture.detectChanges()
    expect(control.getAttribute('aria-pressed')).toBe('true')

    server.calls[0].reply.reject(new Error('offline'))
    await settle()
    fixture.detectChanges()
    expect(control.getAttribute('aria-pressed')).toBe('false')
    expect(label(control)).toBe('5')
    expect(control.getAttribute('data-error')).toBe('Error: offline')
  })

  it('saves with the newest commit the component rendered', async () => {
    const first = vi.fn<(next: Favorite) => Promise<Favorite>>(async (next) => next)
    const second = vi.fn<(next: Favorite) => Promise<Favorite>>(async (next) => next)
    const value = { favorited: false, count: 0 }
    favoriteOptions.set({ value, commit: first })
    const fixture = mount(FavoriteButtonComponent)

    favoriteOptions.set({ value, commit: second })
    fixture.detectChanges()

    button(fixture).click()
    fixture.detectChanges()

    expect(first).not.toHaveBeenCalled()
    expect(second.mock.calls[0]?.slice(0, 2)).toEqual([{ favorited: true, count: 1 }, value])
  })

  it('counts every press of a quantity stepper and saves the newest total', async () => {
    const saves: Array<Deferred<void>> = []
    const commit = vi.fn<(next: number) => Promise<void>>(() => {
      const reply = deferred<void>()
      saves.push(reply)
      return reply.promise
    })
    quantityOptions.set({ value: 1, commit })
    const fixture = mount(QuantityProbeComponent)
    const state = fixture.componentInstance.quantity

    state.update((n) => n + 1)
    state.update((n) => n + 1)
    state.update((n) => n + 1)
    expect(state.value()).toBe(4)

    saves[0].resolve()
    await settle()
    expect(commit.mock.calls.map((call) => call[0])).toEqual([2, 4])

    saves[1].resolve()
    await settle()
    expect(snapshot(state)).toMatchObject({ value: 4, pending: false, error: null })
  })

  it('uses the committed callback when a layout effect makes a change', async () => {
    const first = vi.fn<(next: number) => Promise<number>>(async (next) => next)
    const second = vi.fn<(next: number) => Promise<number>>(async (next) => next)
    layoutOptions.set({ value: 1, commit: first })
    layoutActive.set(false)
    const fixture = mount(LayoutProbeComponent)
    const state = fixture.componentInstance.state

    layoutOptions.set({ value: 1, commit: second })
    layoutActive.set(true)
    fixture.detectChanges()
    await settle()
    fixture.detectChanges()

    expect(first).not.toHaveBeenCalled()
    expect(second.mock.calls[0]?.slice(0, 2)).toEqual([2, 1])
    expect(snapshot(state)).toMatchObject({ value: 2, pending: false, error: null })
  })

  it('uses the committed callback in a descendant layout effect', async () => {
    const first = vi.fn<(next: number) => Promise<number>>(async (next) => next)
    const second = vi.fn<(next: number) => Promise<number>>(async (next) => next)
    layoutOptions.set({ value: 1, commit: first })
    const fixture = mount(LayoutParentComponent)

    layoutOptions.set({ value: 1, commit: second })
    layoutActive.set(true)
    fixture.detectChanges()
    await settle()
    fixture.detectChanges()

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    expect(second.mock.calls[0]?.slice(0, 2)).toEqual([2, 1])
  })

  it('does not duplicate saves or replace saved props in StrictMode with an inline comparator', async () => {
    const commit = vi.fn<(next: Favorite) => Promise<Favorite>>(async (next) => next)
    strictOptions.set({
      value: { favorited: false, count: 2 },
      equals: (a, b) => a.favorited === b.favorited && a.count === b.count,
      commit,
    })
    const fixture = mount(StrictProbeComponent)
    const state = fixture.componentInstance.state

    expect(commit).not.toHaveBeenCalled()
    state.update((current) => ({
      favorited: !current.favorited,
      count: current.count + 1,
    }))
    await settle()
    fixture.detectChanges()

    // A re-render hands the hook a fresh inline comparator and the props it
    // loaded first, as React's render does.
    strictOptions.set({
      value: { favorited: false, count: 2 },
      equals: (a, b) => a.favorited === b.favorited && a.count === b.count,
      commit,
    })
    fixture.detectChanges()

    expect(commit).toHaveBeenCalledTimes(1)
    expect(snapshot(state)).toMatchObject({
      value: { favorited: true, count: 3 },
      pending: false,
      error: null,
    })
  })

  it('does not show a superseded save error when the next tap matches the server', async () => {
    const reply = deferred<boolean>()
    const onError = vi.fn<(error: unknown, value: boolean) => void>()
    const commit = vi.fn<(next: boolean) => Promise<boolean>>(() => reply.promise)
    booleanOptions.set({ value: false, commit, onError })
    const fixture = mount(BooleanProbeComponent)
    const state = fixture.componentInstance.value

    state.update((on) => !on)
    state.update((on) => !on)
    reply.reject(new Error('old request failed'))
    await settle()

    expect(snapshot(state)).toMatchObject({ value: false, pending: false, error: null })
    expect(onError).not.toHaveBeenCalled()
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('keeps confirmed progress when a later request in the same commit fails', async () => {
    const reply = deferred<void>()
    const failure = new Error('second request failed')
    flagsOptions.set({
      value: { first: false, second: false },
      commit: async (_next, _previous, confirm) => {
        confirm((current) => ({ ...current, first: true }))
        await reply.promise
      },
    })
    const fixture = mount(FlagsProbeComponent)
    const state = fixture.componentInstance.state

    state.set({ first: true, second: true })
    reply.reject(failure)
    await settle()

    expect(snapshot(state)).toMatchObject({
      value: { first: true, second: false },
      pending: false,
    })
    expect(state.error()).toBe(failure)
  })
})
