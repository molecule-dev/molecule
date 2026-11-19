// @vitest-environment jsdom
/**
 * Button as an async-action control: while `loading` is set the real
 * `<button>` element must itself be unavailable (`disabled` + `aria-busy`), so
 * a second click cannot reach the caller's request function, and the control
 * must come back when the request settles — resolved or rejected. An explicit
 * `disabled` stays authoritative on its own.
 *
 * A port of `@molecule/app-ui-react/src/__tests__/button-pending-action.test.tsx`
 * onto the Svelte `usePromise` store.
 *
 * @module
 */
import { screen, waitFor } from '@testing-library/dom'
import { flushSync, mount, unmount } from 'svelte'
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
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

const { default: BookmarkButtonHost } = await import('./BookmarkButtonHost.svelte')

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

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
})

/**
 * Renders the bookmark control.
 *
 * @param save - The app-supplied request function.
 * @param disabled - Optional explicit disable from the caller.
 * @returns A getter for the native `<button>`.
 */
function renderBookmark(save: SaveBookmark, disabled?: boolean): () => HTMLButtonElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(mount(BookmarkButtonHost, { target: host, props: { save, disabled } }))
  return () => screen.getByRole('button') as HTMLButtonElement
}

/** Clicks through the button and flushes the resulting update, as React's act does. */
const click = (control: () => HTMLButtonElement): void => {
  flushSync(() => control().click())
}

describe('Button pending action', () => {
  it('is unavailable while the request is pending and takes a single request', async () => {
    const first = deferred<BookmarkSnapshot>()
    const save = vi.fn<SaveBookmark>(() => first.promise)
    const control = renderBookmark(save)

    click(control)

    // Clicks during the request must not reach the caller again: the native
    // control is disabled, not merely ignoring input inside a handler.
    click(control)
    click(control)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(true)

    await waitFor(() => expect(control().disabled).toBe(true))
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

    click(control)
    await waitFor(() => expect(control().disabled).toBe(true))
    click(control)
    expect(save).toHaveBeenCalledTimes(1)

    first.resolve({ bookmarked: true })
    await waitFor(() => expect(control().disabled).toBe(false))
    expect(control().getAttribute('aria-busy')).toBe('false')

    // The control accepts input again, and the value it sends comes from the
    // server's answer rather than from an optimistic local toggle.
    click(control)
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

    click(control)
    await waitFor(() => expect(control().disabled).toBe(true))

    failing.reject(new Error('bookmark service unavailable'))
    await waitFor(() => expect(control().disabled).toBe(false))
    expect(control().getAttribute('aria-busy')).toBe('false')

    click(control)
    expect(save).toHaveBeenCalledTimes(2)

    retrying.resolve({ bookmarked: true })
    await waitFor(() => expect(control().disabled).toBe(false))
    expect(save).toHaveBeenLastCalledWith(true)
  })

  it('stays unavailable when the caller disables it explicitly', () => {
    const save = vi.fn<SaveBookmark>(async () => ({ bookmarked: true }))
    const control = renderBookmark(save, true)

    expect(control().disabled).toBe(true)
    click(control)
    click(control)
    expect(save).not.toHaveBeenCalled()
  })
})
