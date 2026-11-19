// @vitest-environment jsdom

/**
 * A headless server-backed boolean toggle for application-owned markup. This
 * is React's `useOptimisticToggle.test.tsx` against the Angular function; every
 * title is React's. Only the framework-forced mechanics change: a function runs
 * in an injection context (a component field initializer) instead of a hook,
 * the result's fields are signals read with `()`, `detectChanges()` replaces a
 * render, and a signal argument replaces React's re-render with new props.
 *
 * @module
 */

import '@angular/compiler'
import {
  Component,
  computed,
  provideZonelessChangeDetection,
  type Signal,
  signal,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from 'vitest'

import * as bindings from '../../index.js'
import {
  useOptimisticToggle,
  type UseOptimisticToggleOptions,
  type UseOptimisticToggleResult,
} from '../use-optimistic-toggle.js'

/** One outstanding save's answer. */
interface Reply {
  promise: Promise<boolean>
  resolve: (value: boolean) => void
  reject: (error: Error) => void
}

/**
 * A promise whose settlement the case controls.
 *
 * @returns The pending reply.
 */
function deferred(): Reply {
  let resolve!: Reply['resolve']
  let reject!: Reply['reject']
  const promise = new Promise<boolean>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

/** A save adapter that records each request and answers on demand. */
interface ManualServer {
  requests: Array<{ desired: boolean; reply: Reply }>
  commit: ReturnType<typeof vi.fn<(desired: boolean) => Promise<boolean>>>
}

/**
 * Creates a save adapter whose answers the case supplies.
 *
 * @returns The recorded requests and the commit function.
 */
function manualServer(): ManualServer {
  const requests: ManualServer['requests'] = []
  const commit = vi.fn<(desired: boolean) => Promise<boolean>>((desired) => {
    const reply = deferred()
    requests.push({ desired, reply })
    return reply.promise
  })
  return { requests, commit }
}

/** The options the generic toggle probe is created with, and later re-rendered with. */
const toggleOptions = signal<UseOptimisticToggleOptions>({
  value: false,
  commit: async () => false,
})

/** The save adapter the markup probes are created with. */
let markupCommit: (desired: boolean) => Promise<boolean> = async () => false

/** The save adapter the remount probe is created with. */
let remountCommit: (desired: boolean) => Promise<boolean> = async () => false

/** A toggle with no markup, whose options the case replaces. */
@Component({ selector: 'app-test-toggle-probe', template: '' })
class ToggleProbeComponent {
  readonly toggleState: UseOptimisticToggleResult = useOptimisticToggle(toggleOptions)
}

/** A star button whose markup the application owns. */
@Component({
  selector: 'app-test-star-toggle',
  template: `<button type="button" [attr.aria-pressed]="star.value()" (click)="star.toggle()">
    <span data-icon="star"></span>{{ star.value() ? 'Unstar repository' : 'Star repository' }}
  </button>`,
})
class StarToggleComponent {
  readonly star: UseOptimisticToggleResult = useOptimisticToggle({
    value: false,
    commit: (desired: boolean) => markupCommit(desired),
  })
}

/** A subscription button that never disables itself while a save is pending. */
@Component({
  selector: 'app-test-subscription-toggle',
  template: `<button
    type="button"
    (click)="subscription.toggle()"
    [attr.aria-busy]="subscription.pending()"
  >
    {{ subscription.value() ? 'Unsubscribe' : 'Subscribe' }}
  </button>`,
})
class SubscriptionToggleComponent {
  readonly subscription: UseOptimisticToggleResult = useOptimisticToggle({
    value: false,
    commit: (desired: boolean) => markupCommit(desired),
  })
}

/** The server snapshot the remount probe is rendered with, replaced like React's new props. */
const remountEnabled = signal(false)

/** The saved subscription remounted over a fresh asynchronous server snapshot. */
@Component({
  selector: 'app-test-alert-subscription',
  template: `<button type="button" (click)="subscription.toggle()">
    {{ subscription.value() ? 'Unsubscribe from stock alerts' : 'Subscribe to stock alerts' }}
  </button>`,
})
class AlertSubscriptionComponent {
  readonly subscription: UseOptimisticToggleResult = useOptimisticToggle(
    computed(() => ({
      value: remountEnabled(),
      commit: (desired: boolean) => remountCommit(desired),
    })),
  )
}

/** A plain local UI switch with no server commit. */
@Component({
  selector: 'app-test-local-switch',
  template: `<button type="button" (click)="flip()">{{ open() }}</button>`,
})
class LocalSwitchComponent {
  private readonly openState = signal(false)
  readonly open: Signal<boolean> = this.openState.asReadonly()

  /** Flips the local state. */
  flip(): void {
    this.openState.set(!this.openState())
  }
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
 * The label the button shows. Angular's template formatter pads interpolated
 * text with template whitespace, which carries no meaning for a rendered label.
 *
 * @param control - The rendered button.
 * @returns The label text.
 */
function label(control: HTMLButtonElement): string {
  return (control.textContent ?? '').trim()
}

/** Lets every pending promise chain run. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

beforeEach(() => {
  toggleOptions.set({ value: false, commit: async () => false })
  remountEnabled.set(false)
  markupCommit = async () => false
  remountCommit = async () => false
})

afterEach(() => {
  TestBed.resetTestingModule()
})

describe('useOptimisticToggle', () => {
  it('exports the headless toggle from the public framework binding', () => {
    expect(bindings).toHaveProperty('useOptimisticToggle', expect.any(Function))
  })

  it('accepts no current-state argument and requires a server-confirmed boolean', () => {
    expectTypeOf<bindings.UseOptimisticToggleResult['toggle']>().parameters.toEqualTypeOf<[]>()
    expectTypeOf<bindings.UseOptimisticToggleOptions['commit']>().returns.toEqualTypeOf<
      Promise<boolean>
    >()
  })

  it('sends the desired state in both directions with application-owned markup', async () => {
    const server = manualServer()
    markupCommit = server.commit
    const fixture = mount(StarToggleComponent)
    const control = button(fixture)
    control.click()
    fixture.detectChanges()
    expect(label(control)).toBe('Unstar repository')
    expect(control.querySelector('[data-icon="star"]')).not.toBeNull()
    expect(server.requests.map((request) => request.desired)).toEqual([true])
    expect(server.commit).toHaveBeenCalledExactlyOnceWith(true)
    server.requests[0].reply.resolve(true)
    await settle()
    control.click()
    fixture.detectChanges()
    expect(label(control)).toBe('Star repository')
    expect(server.requests.map((request) => request.desired)).toEqual([true, false])
    server.requests[1].reply.resolve(false)
    await settle()
  })

  it('queues a second click even when both use the same action before a render', async () => {
    const server = manualServer()
    toggleOptions.set({ value: false, commit: server.commit })
    const fixture = mount(ToggleProbeComponent)
    const toggle = fixture.componentInstance.toggleState.toggle
    toggle()
    toggle()
    const state = fixture.componentInstance.toggleState
    expect({ value: state.value(), pending: state.pending() }).toEqual({
      value: false,
      pending: true,
    })
    expect(server.requests.map((request) => request.desired)).toEqual([true])
    server.requests[0].reply.resolve(true)
    await settle()
    expect(server.requests.map((request) => request.desired)).toEqual([true, false])
    expect(state.value()).toBe(false)
    server.requests[1].reply.resolve(false)
    await settle()
    expect({ value: state.value(), pending: state.pending(), error: state.error() }).toEqual({
      value: false,
      pending: false,
      error: null,
    })
  })

  it('accepts a second native click while the first save is pending', async () => {
    const server = manualServer()
    markupCommit = server.commit
    const fixture = mount(SubscriptionToggleComponent)
    const control = button(fixture)
    control.click()
    fixture.detectChanges()
    expect(label(control)).toBe('Unsubscribe')
    expect(control.hasAttribute('disabled')).toBe(false)
    control.click()
    fixture.detectChanges()
    expect(label(control)).toBe('Subscribe')
    expect(server.requests.map((request) => request.desired)).toEqual([true])
    server.requests[0].reply.resolve(true)
    await settle()
    fixture.detectChanges()
    expect(label(control)).toBe('Subscribe')
    expect(server.requests.map((request) => request.desired)).toEqual([true, false])
    server.requests[1].reply.resolve(false)
    await settle()
    fixture.detectChanges()
    expect(control.getAttribute('aria-busy')).toBe('false')
  })

  it('settles on the server answer when the server declines the desired change', async () => {
    const server = manualServer()
    toggleOptions.set({ value: false, commit: server.commit })
    const fixture = mount(ToggleProbeComponent)
    const state = fixture.componentInstance.toggleState
    state.toggle()
    expect(state.value()).toBe(true)
    server.requests[0].reply.resolve(false)
    await settle()
    expect({ value: state.value(), pending: state.pending(), error: state.error() }).toEqual({
      value: false,
      pending: false,
      error: null,
    })
    expect(server.requests).toHaveLength(1)
  })

  it('rolls back the newest failure to the confirmed value and reports the error', async () => {
    const server = manualServer()
    const onError = vi.fn<(error: unknown, value: boolean) => void>()
    toggleOptions.set({ value: false, commit: server.commit, onError })
    const fixture = mount(ToggleProbeComponent)
    const state = fixture.componentInstance.toggleState
    state.toggle()
    server.requests[0].reply.resolve(true)
    await settle()
    state.toggle()
    const error = new Error('offline')
    server.requests[1].reply.reject(error)
    await settle()
    expect({ value: state.value(), pending: state.pending(), error: state.error() }).toEqual({
      value: true,
      pending: false,
      error,
    })
    expect(onError).toHaveBeenCalledExactlyOnceWith(error, true)
  })

  it('keeps pending intent through refetches and uses the latest committed save adapter', async () => {
    const first = manualServer()
    const next = manualServer()
    toggleOptions.set({ value: false, commit: first.commit })
    const fixture = mount(ToggleProbeComponent)
    const state = fixture.componentInstance.toggleState
    const action = state.toggle
    toggleOptions.set({ value: true, commit: next.commit })
    fixture.detectChanges()
    expect(state.value()).toBe(true)
    expect(state.toggle).toBe(action)
    action()
    expect(first.requests).toHaveLength(0)
    expect(next.requests.map((request) => request.desired)).toEqual([false])
    toggleOptions.set({ value: false, commit: next.commit })
    fixture.detectChanges()
    toggleOptions.set({ value: true, commit: next.commit })
    fixture.detectChanges()
    expect(state.value()).toBe(false)
    next.requests[0].reply.resolve(false)
    await settle()
    expect({ value: state.value(), pending: state.pending() }).toEqual({
      value: false,
      pending: false,
    })
  })

  it('uses a late server boolean as the source for the next argument-free action', async () => {
    const commit = vi.fn<(desired: boolean) => Promise<boolean>>(async (desired) => desired)
    toggleOptions.set({ value: false, commit })
    const fixture = mount(ToggleProbeComponent)
    const state = fixture.componentInstance.toggleState
    toggleOptions.set({ value: true, commit })
    fixture.detectChanges()
    expect(state.value()).toBe(true)
    state.toggle()
    expect(commit).toHaveBeenCalledExactlyOnceWith(false)
    await settle()
    expect(state.value()).toBe(false)
  })

  it('restores a saved subscription from a fresh asynchronous server snapshot after remount', async () => {
    let saved = false
    const methods: string[] = []
    remountCommit = async (desired: boolean): Promise<boolean> => {
      methods.push(desired ? 'PUT' : 'DELETE')
      saved = desired
      return saved
    }
    const first = mount(AlertSubscriptionComponent)
    button(first).click()
    await settle()
    first.detectChanges()
    expect(saved).toBe(true)
    expect(label(button(first))).toBe('Unsubscribe from stock alerts')
    first.destroy()
    remountEnabled.set(false)
    const reloaded = mount(AlertSubscriptionComponent)
    remountEnabled.set(saved)
    reloaded.detectChanges()
    expect(label(button(reloaded))).toBe('Unsubscribe from stock alerts')
    button(reloaded).click()
    await settle()
    reloaded.detectChanges()
    expect(saved).toBe(false)
    expect(methods).toEqual(['PUT', 'DELETE'])
  })

  it('leaves a local UI switch as plain state with no server commit', () => {
    const fixture = mount(LocalSwitchComponent)
    button(fixture).click()
    fixture.detectChanges()
    expect(label(button(fixture))).toBe('true')
    button(fixture).click()
    fixture.detectChanges()
    expect(label(button(fixture))).toBe('false')
  })
})
