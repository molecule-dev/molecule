// @vitest-environment jsdom
/**
 * Owning behavior tests for `Button` as an async-action control: while
 * `loading` is set the real `<button>` element must itself be unavailable
 * (`disabled` + `aria-busy`), so a second click cannot reach the caller's
 * request function, and the control must come back when the request settles —
 * resolved or rejected. An explicit `disabled` stays authoritative on its own.
 * A port of `@molecule/app-ui-react/src/__tests__/button-pending-action.test.tsx`
 * onto Angular's `usePromise`, which feeds the pending state the way a product
 * screen wires a save action.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads.
import '@angular/compiler'
import {
  ChangeDetectorRef,
  Component,
  inject,
  InjectionToken,
  provideZonelessChangeDetection,
} from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { usePromise } from '@molecule/app-angular'

vi.mock('@molecule/app-ui', () => {
  // Only the resolvers the component CALLS may be functions; a class binding
  // rejects a function value, so every other token is the plain string.
  const CALLABLE = new Set(['button', 'spinner', 'cn'])
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop) {
      if (prop === 'cn') {
        return (...cls: unknown[]) =>
          cls
            .flat(Infinity)
            .filter((c) => typeof c === 'string' && c.length > 0)
            .join(' ')
      }
      if (typeof prop === 'string' && CALLABLE.has(prop)) return () => prop
      return String(prop)
    },
  }
  return { getClassMap: () => new Proxy({}, handler) }
})

vi.mock('@molecule/app-icons', () => ({
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

const { Button } = await import('../components/button.component.js')

/** A promise the test settles explicitly. */
interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

/**
 * Creates a promise together with its settle functions.
 *
 * @returns The promise and its `resolve`/`reject`.
 */
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** The server's own answer after a bookmark save. */
interface BookmarkSnapshot {
  bookmarked: boolean
}

/** The caller's request function, standing in for an application's adapter. */
type SaveBookmark = (next: boolean) => Promise<BookmarkSnapshot>

/** The request function the mounted control calls. */
const SAVE = new InjectionToken<SaveBookmark>('test-save-bookmark')

/**
 * Minimal consumer: the real `Button` with the real `usePromise` feeding the
 * pending state to `loading`, the way a product screen wires a save action.
 * Built with the `Component({...})(class …)` factory (this package's test
 * config does not compile legacy decorators in test files).
 */
const BookmarkButton = Component({
  selector: 'div[data-test-host]',
  standalone: true,
  imports: [Button],
  template: `<button
    mol-button
    [disabled]="disabled"
    [loading]="state.status === 'pending'"
    (click)="submit()"
  >
    {{ state.value?.bookmarked ? 'Remove bookmark' : 'Bookmark' }}
  </button>`,
})(
  class BookmarkButtonComponent {
    private readonly save = inject(SAVE)
    // `usePromise` keeps its state in a plain (non-signal) object: React hands
    // back a new state object on every call, while Angular re-renders on the
    // next change detection, so the consumer marks the view for a re-read when
    // the tracked call settles.
    private readonly cdr = inject(ChangeDetectorRef)
    private readonly promise = usePromise(this.save)
    disabled = false

    /** The latest call's state (mutated in place by `usePromise`). */
    get state(): (typeof this.promise)[0] {
      return this.promise[0]
    }

    /** Runs the request from the server's last answer, as a product screen does. */
    submit(): void {
      const bookmarked = this.state.value?.bookmarked ?? false
      void this.promise[1](!bookmarked).then(
        () => this.cdr.markForCheck(),
        // `usePromise` already records the rejection in `state.error`; this
        // handler only re-renders the control and keeps it unhandled-free.
        (_error: unknown) => this.cdr.markForCheck(),
      )
    }
  },
)

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
})

/** The mounted bookmark control. */
interface Mounted {
  /** The native `<button>` the component host is. */
  control: () => HTMLButtonElement
  /** Activates the control and runs the change detection the click schedules. */
  click: () => void
  /** Lets a settled request's handlers run, then renders the new state. */
  settle: () => Promise<void>
}

/**
 * Renders the bookmark control with the request function injected.
 *
 * @param save - The app-supplied request function.
 * @param disabled - Optional explicit disable from the caller.
 * @returns The mounted control.
 */
function renderBookmark(save: SaveBookmark, disabled?: boolean): Mounted {
  TestBed.configureTestingModule({
    imports: [BookmarkButton],
    providers: [provideZonelessChangeDetection(), { provide: SAVE, useValue: save }],
  })
  const fixture = TestBed.createComponent(BookmarkButton)
  fixture.componentInstance.disabled = disabled ?? false
  fixture.detectChanges()
  const control = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('button') as HTMLButtonElement
  return {
    control,
    click: () => {
      control().click()
      fixture.detectChanges()
    },
    settle: async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      fixture.detectChanges()
    },
  }
}

describe('Button pending action', () => {
  it('is unavailable while the request is pending and takes a single request', async () => {
    const first = deferred<BookmarkSnapshot>()
    const save = vi.fn<SaveBookmark>(() => first.promise)
    const view = renderBookmark(save)

    view.click()

    // Clicks during the request must not reach the caller again: the native
    // control is disabled, not merely ignoring input inside a handler.
    view.click()
    view.click()
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(true)

    // The pending state is rendered by the change detection the click schedules.
    expect(view.control().disabled).toBe(true)
    expect(view.control().getAttribute('aria-busy')).toBe('true')
  })

  it('returns after the request resolves and sends the next value from the server answer', async () => {
    const first = deferred<BookmarkSnapshot>()
    const second = deferred<BookmarkSnapshot>()
    const save = vi
      .fn<SaveBookmark>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const view = renderBookmark(save)

    view.click()
    expect(view.control().disabled).toBe(true)
    view.click()
    expect(save).toHaveBeenCalledTimes(1)

    first.resolve({ bookmarked: true })
    await view.settle()
    expect(view.control().disabled).toBe(false)
    expect(view.control().getAttribute('aria-busy')).toBe('false')

    // The control accepts input again, and the value it sends comes from the
    // server's answer rather than from an optimistic local toggle.
    view.click()
    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith(false)
  })

  it('returns after a rejected request and accepts the retry', async () => {
    const failing = deferred<BookmarkSnapshot>()
    const retrying = deferred<BookmarkSnapshot>()
    const save = vi
      .fn<SaveBookmark>()
      .mockImplementationOnce(() => failing.promise)
      .mockImplementationOnce(() => retrying.promise)
    const view = renderBookmark(save)

    view.click()
    expect(view.control().disabled).toBe(true)

    failing.reject(new Error('bookmark service unavailable'))
    await view.settle()
    expect(view.control().disabled).toBe(false)
    expect(view.control().getAttribute('aria-busy')).toBe('false')

    view.click()
    expect(save).toHaveBeenCalledTimes(2)

    retrying.resolve({ bookmarked: true })
    await view.settle()
    expect(view.control().disabled).toBe(false)
    expect(save).toHaveBeenLastCalledWith(true)
  })

  it('stays unavailable when the caller disables it explicitly', async () => {
    const save = vi.fn<SaveBookmark>(async () => ({ bookmarked: true }))
    const view = renderBookmark(save, true)

    expect(view.control().disabled).toBe(true)
    view.click()
    view.click()
    expect(save).not.toHaveBeenCalled()
  })
})
