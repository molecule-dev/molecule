// @vitest-environment jsdom
/**
 * Owning behavior tests for `Button` as an async-action control: while
 * `loading` is set the real `<button>` element must itself be unavailable
 * (`disabled` + `aria-busy`), so a second click cannot reach the caller's
 * request function, and the control must come back when the request settles —
 * resolved or rejected. An explicit `disabled` stays authoritative on its own.
 *
 * Vue port of `@molecule/app-ui-react`'s `button-pending-action` test. The
 * pending state is the real `usePromise` composable from `@molecule/app-vue`
 * (an existing peer dependency of this package) and the request is a deferred
 * local fake. The domain (saving a bookmark) is deliberately generic: the rule
 * belongs to the shared component, not to one application.
 *
 * @module
 */
import { waitFor } from '@testing-library/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

import { createApp, defineComponent, h, nextTick, type PropType } from 'vue'

const { usePromise } = await import('@molecule/app-vue')
const { Button } = await import('../components/Button.js')

/** A promise the test settles explicitly. */
interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

/**
 * Creates a promise together with its settle functions.
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

/**
 * Minimal consumer: the real `Button` with the real `usePromise` composable
 * feeding the pending state to `loading`, the way a product screen wires a
 * save action.
 */
const BookmarkButton = defineComponent({
  name: 'BookmarkButton',
  props: {
    save: { type: Function as PropType<SaveBookmark>, required: true },
    disabled: { type: Boolean, default: false },
  },
  setup(props) {
    const [state, saveBookmark] = usePromise(props.save)
    const bookmarked = (): boolean => state.value?.bookmarked ?? false

    const submit = (): void => {
      // `usePromise` already records a rejection in `state.error`; this guard only
      // keeps a rejected request from surfacing as an unhandled rejection.
      void saveBookmark(!bookmarked()).catch((_error: unknown) => {})
    }

    return () =>
      h(
        Button,
        { disabled: props.disabled, loading: state.status === 'pending', onClick: submit },
        () => (bookmarked() ? 'Remove bookmark' : 'Bookmark'),
      )
  },
})

const mounted: ReturnType<typeof createApp>[] = []

/**
 * Renders the bookmark control.
 * @param save - The app-supplied request function.
 * @param disabled - Optional explicit disable from the caller.
 * @returns A getter for the native `<button>`.
 */
function renderBookmark(save: SaveBookmark, disabled?: boolean): () => HTMLButtonElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({ render: () => h(BookmarkButton, { save, disabled }) })
  app.mount(host)
  mounted.push(app)
  return () => document.querySelector('button')!
}

afterEach(() => {
  for (const app of mounted.splice(0)) app.unmount()
  document.body.innerHTML = ''
})

describe('Button pending action', () => {
  it('is unavailable while the request is pending and takes a single request', async () => {
    const first = deferred<BookmarkSnapshot>()
    const save = vi.fn<SaveBookmark>(() => first.promise)
    const control = renderBookmark(save)

    control().click()
    await nextTick()

    // Clicks during the request must not reach the caller again: the native
    // control is disabled, not merely ignoring input inside a handler.
    expect(control().disabled).toBe(true)
    control().click()
    control().click()
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(true)
    expect(control().getAttribute('aria-busy')).toBe('true')
  })

  it('returns after the request resolves and sends the next value from the server answer', async () => {
    const first = deferred<BookmarkSnapshot>()
    const second = deferred<BookmarkSnapshot>()
    const save = vi
      .fn<SaveBookmark>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const control = renderBookmark(save)

    control().click()
    await nextTick()
    expect(control().disabled).toBe(true)
    control().click()
    expect(save).toHaveBeenCalledTimes(1)

    first.resolve({ bookmarked: true })
    await waitFor(() => expect(control().disabled).toBe(false))
    expect(control().getAttribute('aria-busy')).toBe('false')

    // The control accepts input again, and the value it sends comes from the
    // server's answer rather than from an optimistic local toggle.
    control().click()
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
    const control = renderBookmark(save)

    control().click()
    await nextTick()
    expect(control().disabled).toBe(true)

    failing.reject(new Error('bookmark service unavailable'))
    await waitFor(() => expect(control().disabled).toBe(false))
    expect(control().getAttribute('aria-busy')).toBe('false')

    control().click()
    expect(save).toHaveBeenCalledTimes(2)

    retrying.resolve({ bookmarked: true })
    await waitFor(() => expect(control().disabled).toBe(false))
    expect(save).toHaveBeenLastCalledWith(true)
  })

  it('stays unavailable when the caller disables it explicitly', () => {
    const save = vi.fn<SaveBookmark>(async () => ({ bookmarked: true }))
    const control = renderBookmark(save, true)

    expect(control().disabled).toBe(true)
    control().click()
    control().click()
    expect(save).not.toHaveBeenCalled()
  })
})
