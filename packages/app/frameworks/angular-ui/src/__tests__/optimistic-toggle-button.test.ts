// @vitest-environment jsdom
/**
 * Behavior tests for `OptimisticToggleButton` — Angular port of
 * `@molecule/app-ui-react/src/__tests__/optimistic-toggle-button.test.tsx`:
 * the first tap flips the label and pressed state at once (including through a
 * save longer than the deployed wait), saves run in order, only the newest
 * failure rolls back, a same-record refetch keeps a pending choice, the app
 * keeps the permission and self-record gates, and a new record starts from its
 * own server value.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import {
  type ApplicationRef,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { within } from '@testing-library/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    // Tokens the button templates CALL; every other token is read as a plain
    // string by the `[class]` bindings.
    const CALLABLE = new Set(['cn', 'button'])
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
    return new Proxy({}, handler)
  },
}))

const { Button } = await import('../components/button.component.js')
const { OptimisticToggleButton } =
  await import('../components/optimistic-toggle-button.component.js')

/** The save contract the component consumes. */
type Commit = (desired: boolean) => Promise<boolean>

/** A promise the test settles explicitly. */
interface Deferred<T> {
  /** The promise handed to the component. */
  promise: Promise<T>
  /** Resolves it. */
  resolve: (value: T) => void
  /** Rejects it. */
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
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

/** A toggle whose inputs the test drives. */
const ToggleHost = Component({
  selector: 'mol-spec-toggle-host',
  standalone: true,
  imports: [OptimisticToggleButton],
  template: `<button
    mol-optimistic-toggle-button
    [value]="value()"
    [commit]="commit"
    [disabled]="disabled"
    [onError]="onError"
    ><span slot="activeLabel">{{ activeLabelText }}</span
    ><span slot="inactiveLabel">{{ inactiveLabelText }}</span></button
  >`,
})(
  class SpecToggleHost {
    /** The loaded server value (React's `value` prop). */
    readonly value = signal(false)
    /** Saves the desired boolean. */
    commit: Commit = async (next) => next
    /** Receives a failed save. */
    onError?: (error: unknown) => void
    /** Explicit permission disable. */
    disabled = false
    /** Label when the displayed value is true. */
    activeLabelText = 'Unstar'
    /** Label when the displayed value is false. */
    inactiveLabelText = 'Star'
  },
)

/** A page-level gate around the toggle (React's `signedIn && !self` render). */
const GatedHost = Component({
  selector: 'mol-spec-toggle-gated',
  standalone: true,
  imports: [OptimisticToggleButton],
  template: `@if (signedIn() && !self()) {
    <button mol-optimistic-toggle-button [value]="false" [commit]="commit"
      ><span slot="activeLabel">Unfollow</span
      ><span slot="inactiveLabel">Follow</span></button
    >
  }`,
})(
  class SpecGatedHost {
    /** Whether the visitor is signed in. */
    readonly signedIn = signal(true)
    /** Whether the record belongs to the visitor. */
    readonly self = signal(false)
    /** Saves the desired boolean. */
    commit: Commit = async (next) => next
  },
)

/** A disabled toggle whose native element the caller holds. */
const DisabledHost = Component({
  selector: 'mol-spec-toggle-disabled',
  standalone: true,
  imports: [OptimisticToggleButton],
  template: `<button mol-optimistic-toggle-button [value]="false" [commit]="commit" [disabled]="true"
    ><span slot="activeLabel">Unstar</span><span slot="inactiveLabel">Star</span></button
  >`,
})(
  class SpecDisabledHost {
    /** Saves the desired boolean. */
    commit: Commit = async (next) => next
  },
)

/** A plain local UI button. */
const LocalButtonHost = Component({
  selector: 'mol-spec-local-button',
  standalone: true,
  imports: [Button],
  template: `<button mol-button (click)="onClick()">Open menu</button>`,
})(
  class SpecLocalButtonHost {
    /** The click handler under test. */
    onClick = (): void => {}
  },
)

let appRef: ApplicationRef
const views: Array<{ destroy: () => void }> = []

beforeEach(async () => {
  if (!appRef)
    appRef = await createApplication({
      providers: [provideZonelessChangeDetection(), provideDomPlacement()],
    })
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.useRealTimers()
  for (const view of views.splice(0)) view.destroy()
  document.body.innerHTML = ''
})

/**
 * Mounts a host component and runs the mounting change-detection passes.
 *
 * @param component - The host component type.
 * @param configure - Applies the test's props before the first pass.
 * @returns The component ref.
 */
async function mount<T>(
  component: Type<T>,
  configure?: (instance: T) => void,
): Promise<ComponentRef<T>> {
  const ref = createComponent(component, { environmentInjector: appRef.injector })
  if (configure) configure(ref.instance)
  document.body.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  views.push(ref)
  appRef.tick()
  await flush()
  return ref
}

/**
 * Destroys a mounted host (React's key change remounts the control).
 *
 * @param ref - The component ref to destroy.
 */
function destroy<T>(ref: ComponentRef<T>): void {
  const index = views.indexOf(ref)
  if (index !== -1) views.splice(index, 1)
  ref.destroy()
}

/** Flushes pending microtasks and runs change detection. */
async function flush(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  appRef.tick()
}

/** The rendered toggle button. */
const toggleButton = (): HTMLButtonElement =>
  document.querySelector<HTMLButtonElement>('button[mol-optimistic-toggle-button]')!

/** The plain local `<button mol-button>` under test. */
const localButton = (): HTMLButtonElement =>
  document.querySelector<HTMLButtonElement>('button[mol-button]')!

describe('OptimisticToggleButton', () => {
  it.each([
    ['Favorite Article', 'Unfavorite Article'],
    ['Watch equipment', 'Stop watching equipment'],
  ])(
    'keeps the complete %s action label through persistence and remount',
    async (inactiveLabel, activeLabel) => {
      let persisted = false
      const commit = vi.fn<Commit>(async (desired) => {
        persisted = desired
        return persisted
      })
      const first = await mount(ToggleHost, (instance) => {
        instance.commit = commit
        instance.activeLabelText = activeLabel
        instance.inactiveLabelText = inactiveLabel
      })
      toggleButton().click()
      await flush()
      expect(
        within(document.body)
          .getByRole('button', { name: activeLabel })
          .getAttribute('aria-pressed'),
      ).toBe('true')
      expect(commit).toHaveBeenCalledExactlyOnceWith(true)
      // A reload mounts the toggle from the saved value (React's unmount +
      // fresh render with `value={persisted}`).
      destroy(first)

      await mount(ToggleHost, (instance) => {
        instance.commit = commit
        instance.activeLabelText = activeLabel
        instance.inactiveLabelText = inactiveLabel
        instance.value.set(persisted)
      })
      toggleButton().click()
      await flush()
      expect(
        within(document.body)
          .getByRole('button', { name: inactiveLabel })
          .getAttribute('aria-pressed'),
      ).toBe('false')
      expect(commit.mock.calls).toEqual([[true], [false]])
    },
  )

  it('flips Follow to Unfollow immediately through a save longer than the deployed wait', async () => {
    vi.useFakeTimers()
    const response = deferred<boolean>()
    const commit = vi.fn<Commit>(() => response.promise)
    await mount(ToggleHost, (instance) => {
      instance.commit = commit
      instance.activeLabelText = 'Unfollow'
      instance.inactiveLabelText = 'Follow'
    })
    const button = toggleButton()
    button.click()
    await flush()
    // The same native button already shows the opposite action, and it is not
    // disabled while the save runs.
    expect(within(document.body).getByRole('button', { name: 'Unfollow' })).toBe(button)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.disabled).toBe(false)
    // A deployed wait longer than the server's answer must not revert or wedge it.
    await vi.advanceTimersByTimeAsync(6_000)
    await flush()
    expect(button.textContent).toBe('Unfollow')
    expect(commit).toHaveBeenCalledExactlyOnceWith(true)
    response.resolve(true)
    await flush()
    button.click()
    appRef.tick()
    expect(button.textContent).toBe('Follow')
  })

  it('saves a second tap in order while the first save is pending (non-X1 alerts)', async () => {
    const first = deferred<boolean>()
    const second = deferred<boolean>()
    const commit = vi
      .fn<Commit>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    await mount(ToggleHost, (instance) => {
      instance.commit = commit
      instance.activeLabelText = 'Mute alerts'
      instance.inactiveLabelText = 'Enable alerts'
    })
    const button = toggleButton()
    button.click()
    button.click()
    await flush()
    expect(button.textContent).toBe('Enable alerts')
    expect(commit.mock.calls).toEqual([[true]])
    first.resolve(true)
    await flush()
    expect(commit.mock.calls).toEqual([[true], [false]])
    expect(button.textContent).toBe('Enable alerts')
    second.resolve(false)
    await flush()
    expect(button.getAttribute('aria-busy')).toBe('false')
  })

  it('rolls back a rejected save and permits another try', async () => {
    const response = deferred<boolean>()
    const error = new Error('save rejected')
    const onError = vi.fn<(reason: unknown) => void>()
    const commit = vi.fn<Commit>().mockReturnValueOnce(response.promise).mockResolvedValueOnce(true)
    await mount(ToggleHost, (instance) => {
      instance.commit = commit
      instance.onError = onError
    })
    const button = toggleButton()
    button.click()
    response.reject(error)
    await flush()
    expect(button.textContent).toBe('Star')
    expect(onError).toHaveBeenCalledWith(error)
    button.click()
    await flush()
    expect(button.textContent).toBe('Unstar')
    expect(commit).toHaveBeenCalledTimes(2)
  })

  it('keeps a pending choice during a same-record refetch and accepts a later server change', async () => {
    const response = deferred<boolean>()
    const commit: Commit = () => response.promise
    const ref = await mount(ToggleHost, (instance) => {
      instance.commit = commit
      instance.activeLabelText = 'Unfollow'
      instance.inactiveLabelText = 'Follow'
    })
    const button = toggleButton()
    button.click()
    await flush()
    // A same-record refetch hands the same server value back: the pending
    // choice stays on screen.
    ref.instance.value.set(false)
    await flush()
    expect(button.textContent).toBe('Unfollow')
    response.resolve(true)
    await flush()
    // A later server change is taken once nothing is pending.
    ref.instance.value.set(true)
    await flush()
    ref.instance.value.set(false)
    await flush()
    expect(button.textContent).toBe('Follow')
  })

  it('keeps a visitor action present, with explicit permission and self-record gates in the app', async () => {
    const commit = vi.fn<Commit>(async (next) => next)
    const ref = await mount(GatedHost, (instance) => {
      instance.commit = commit
    })
    expect(within(document.body).getByRole('button', { name: 'Follow' })).toBeTruthy()
    ref.instance.self.set(true)
    await flush()
    expect(within(document.body).queryByRole('button')).toBeNull()
    ref.instance.self.set(false)
    ref.instance.signedIn.set(false)
    await flush()
    expect(within(document.body).queryByRole('button')).toBeNull()
    expect(commit).not.toHaveBeenCalled()
  })

  it('honors an explicit permission disable and forwards the native ref', async () => {
    const commit = vi.fn<Commit>(async (next) => next)
    await mount(DisabledHost, (instance) => {
      instance.commit = commit
    })
    const button = toggleButton()
    // Angular has no ref forwarding: the component's host IS the native
    // button, which is what a caller's view query (or querySelector) reaches.
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('mol-optimistic-toggle-button')).toBe('')
    button.click()
    expect(button.disabled).toBe(true)
    expect(commit).not.toHaveBeenCalled()
  })

  it('resets the display and pending work when the record key changes', async () => {
    const response = deferred<boolean>()
    const commit: Commit = () => response.promise
    const first = await mount(ToggleHost, (instance) => {
      instance.commit = commit
    })
    toggleButton().click()
    await flush()
    expect(toggleButton().textContent).toBe('Unstar')
    // A new record mounts a fresh button, so the old record's pending save
    // cannot show through.
    destroy(first)
    const second = await mount(ToggleHost, (instance) => {
      instance.commit = commit
    })
    response.resolve(true)
    await flush()
    expect(toggleButton().textContent).toBe('Star')
    expect(toggleButton().getAttribute('aria-busy')).toBe('false')
    destroy(second)
  })

  it('leaves a local UI button on its existing path', async () => {
    const click = vi.fn<() => void>()
    await mount(LocalButtonHost, (instance) => {
      instance.onClick = click
    })
    localButton().click()
    expect(click).toHaveBeenCalledOnce()
  })
})
