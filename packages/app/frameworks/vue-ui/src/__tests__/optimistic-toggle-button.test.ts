// @vitest-environment jsdom
/**
 * Behavior tests for `OptimisticToggleButton` — Vue port of
 * `@molecule/app-ui-react/src/__tests__/optimistic-toggle-button.test.tsx`:
 * the first tap flips the label and pressed state at once (including through
 * a save longer than the deployed wait), saves run in order, only the newest
 * failure rolls back, a same-record refetch keeps a pending choice, the app
 * keeps the permission and self-record gates, and a key change resets the
 * display.
 *
 * @module
 */
import { waitFor, within } from '@testing-library/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

import {
  type App,
  type ComponentPublicInstance,
  createApp,
  h,
  nextTick,
  ref,
  type VNodeChild,
} from 'vue'

const { Button } = await import('../components/Button.js')
const { OptimisticToggleButton } = await import('../components/OptimisticToggleButton.js')

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
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

/** The save contract the component consumes. */
type Commit = (desired: boolean) => Promise<boolean>

const apps: App[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  document.body.innerHTML = ''
  vi.useRealTimers()
})

/**
 * Mounts a render function into a fresh host.
 *
 * @param render - The component render.
 * @returns The mounted app.
 */
function mount(render: () => VNodeChild): App {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({ render })
  apps.push(app)
  app.mount(host)
  return app
}

/**
 * Unmounts an app mounted by {@link mount} before the afterEach sweep.
 *
 * @param app - The app to unmount.
 */
function unmount(app: App): void {
  const index = apps.indexOf(app)
  if (index !== -1) apps.splice(index, 1)
  app.unmount()
}

const body = (): ReturnType<typeof within> => within(document.body)

const button = (): HTMLButtonElement => body().getByRole('button') as HTMLButtonElement

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
      const props = { commit, inactiveLabel, activeLabel }
      const first = mount(() => h(OptimisticToggleButton, { value: persisted, ...props }))
      body().getByRole('button', { name: inactiveLabel }).click()
      await waitFor(() =>
        expect(body().getByRole('button', { name: activeLabel }).getAttribute('aria-pressed')).toBe(
          'true',
        ),
      )
      expect(commit).toHaveBeenCalledExactlyOnceWith(true)
      unmount(first)

      // A fresh mount of the reloaded record (persisted is now true) starts from
      // the saved value and toggles back through the same complete labels.
      mount(() => h(OptimisticToggleButton, { value: persisted, ...props }))
      body().getByRole('button', { name: activeLabel }).click()
      await waitFor(() =>
        expect(
          body().getByRole('button', { name: inactiveLabel }).getAttribute('aria-pressed'),
        ).toBe('false'),
      )
      expect(commit.mock.calls).toEqual([[true], [false]])
    },
  )

  it('flips Follow to Unfollow immediately through a save longer than the deployed wait', async () => {
    vi.useFakeTimers()
    const response = deferred<boolean>()
    const commit = vi.fn<Commit>(() => response.promise)
    mount(() =>
      h(OptimisticToggleButton, {
        value: false,
        commit,
        activeLabel: 'Unfollow',
        inactiveLabel: 'Follow',
      }),
    )
    const element = body().getByRole('button', { name: 'Follow' }) as HTMLButtonElement
    element.click()
    await nextTick()
    // The same native button already shows the opposite action, and it is not
    // disabled while the save runs.
    expect(body().getByRole('button', { name: 'Unfollow' })).toBe(element)
    expect(element.getAttribute('aria-pressed')).toBe('true')
    expect(element.disabled).toBe(false)
    // A deployed wait longer than the server's answer must not revert or wedge it.
    await vi.advanceTimersByTimeAsync(6_000)
    await nextTick()
    expect(element.textContent).toBe('Unfollow')
    expect(commit).toHaveBeenCalledExactlyOnceWith(true)
    response.resolve(true)
    await nextTick()
    element.click()
    await nextTick()
    expect(element.textContent).toBe('Follow')
  })

  it('saves a second tap in order while the first save is pending (non-X1 alerts)', async () => {
    const first = deferred<boolean>()
    const second = deferred<boolean>()
    const commit = vi
      .fn<Commit>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    mount(() =>
      h(OptimisticToggleButton, {
        value: false,
        commit,
        activeLabel: 'Mute alerts',
        inactiveLabel: 'Enable alerts',
      }),
    )
    const element = button()
    element.click()
    element.click()
    await nextTick()
    expect(element.textContent).toBe('Enable alerts')
    expect(commit.mock.calls).toEqual([[true]])
    first.resolve(true)
    await waitFor(() => expect(commit.mock.calls).toEqual([[true], [false]]))
    expect(element.textContent).toBe('Enable alerts')
    second.resolve(false)
    await waitFor(() => expect(element.getAttribute('aria-busy')).toBe('false'))
  })

  it('rolls back a rejected save and permits another try', async () => {
    const response = deferred<boolean>()
    const error = new Error('save rejected')
    const onError = vi.fn<(reason: unknown) => void>()
    const commit = vi.fn<Commit>().mockReturnValueOnce(response.promise).mockResolvedValueOnce(true)
    mount(() =>
      h(OptimisticToggleButton, {
        value: false,
        commit,
        onError,
        activeLabel: 'Unstar',
        inactiveLabel: 'Star',
      }),
    )
    const element = button()
    element.click()
    response.reject(error)
    await waitFor(() => expect(element.textContent).toBe('Star'))
    expect(onError).toHaveBeenCalledWith(error)
    element.click()
    await nextTick()
    expect(element.textContent).toBe('Unstar')
    expect(commit).toHaveBeenCalledTimes(2)
  })

  it('keeps a pending choice during a same-record refetch and accepts a later server change', async () => {
    const response = deferred<boolean>()
    const value = ref(false)
    const commit: Commit = () => response.promise
    mount(() =>
      h(OptimisticToggleButton, {
        value: value.value,
        commit,
        activeLabel: 'Unfollow',
        inactiveLabel: 'Follow',
      }),
    )
    const element = button()
    element.click()
    await nextTick()
    // A same-record refetch hands the same server value back: the pending
    // choice stays on screen.
    value.value = false
    await nextTick()
    expect(element.textContent).toBe('Unfollow')
    response.resolve(true)
    await nextTick()
    // A later server change is taken once nothing is pending.
    value.value = true
    await nextTick()
    value.value = false
    await nextTick()
    expect(element.textContent).toBe('Follow')
  })

  it('keeps a visitor action present, with explicit permission and self-record gates in the app', async () => {
    const commit = vi.fn<Commit>(async (next) => next)
    const signedIn = ref(true)
    const self = ref(false)
    mount(() =>
      signedIn.value && !self.value
        ? h(OptimisticToggleButton, {
            value: false,
            commit,
            activeLabel: 'Unfollow',
            inactiveLabel: 'Follow',
          })
        : null,
    )
    expect(body().getByRole('button', { name: 'Follow' })).toBeTruthy()
    self.value = true
    await nextTick()
    expect(body().queryByRole('button')).toBeNull()
    self.value = false
    signedIn.value = false
    await nextTick()
    expect(body().queryByRole('button')).toBeNull()
    expect(commit).not.toHaveBeenCalled()
  })

  it('honors an explicit permission disable and forwards the native ref', async () => {
    const commit = vi.fn<Commit>(async (next) => next)
    const instance = ref<ComponentPublicInstance | null>(null)
    mount(() =>
      h(OptimisticToggleButton, {
        ref: instance,
        disabled: true,
        value: false,
        commit,
        activeLabel: 'Unstar',
        inactiveLabel: 'Star',
      }),
    )
    const element = button()
    // A caller's template ref reads the ref element at `$el`, which Vue
    // assigns once the first render's refs are flushed.
    await nextTick()
    expect(instance.value?.$el).toBe(element)
    element.click()
    expect(element.disabled).toBe(true)
    expect(commit).not.toHaveBeenCalled()
  })

  it('resets the display and pending work when the record key changes', async () => {
    const response = deferred<boolean>()
    const recordKey = ref('a')
    const commit: Commit = () => response.promise
    mount(() =>
      h(OptimisticToggleButton, {
        key: recordKey.value,
        value: false,
        commit,
        activeLabel: 'Unstar',
        inactiveLabel: 'Star',
      }),
    )
    button().click()
    await nextTick()
    expect(button().textContent).toBe('Unstar')
    // A new record mounts a fresh button, so the old record's pending save
    // cannot show through.
    recordKey.value = 'b'
    await nextTick()
    response.resolve(true)
    await nextTick()
    expect(button().textContent).toBe('Star')
  })

  it('leaves a local UI button on its existing path', async () => {
    const click = vi.fn<() => void>()
    mount(() => h(Button, { onClick: click }, { default: () => 'Open menu' }))
    button().click()
    expect(click).toHaveBeenCalledOnce()
  })
})
