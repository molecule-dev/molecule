// @vitest-environment jsdom
/**
 * Owning behavior tests for `Button` as an async-action control, the Solid port
 * of `@molecule/app-ui-react`'s `button-pending-action.test.tsx`: while
 * `loading` is set the real `<button>` element must itself be unavailable
 * (`disabled` + `aria-busy`), so a second click cannot reach the caller's
 * request function, and the control must come back when the request settles —
 * resolved or rejected. An explicit `disabled` stays authoritative on its own.
 *
 * The pending state is the real `usePromise` primitive from `@molecule/app-solid`
 * and the request is a deferred local fake. The domain (saving a bookmark) is
 * deliberately generic: the rule belongs to the shared component, not to one
 * application.
 *
 * Solid's `usePromise` tuple exposes index 0 as a getter, so the state is read
 * through an accessor inside the render (a destructured value would be the
 * snapshot taken at setup and never update).
 *
 * @module
 */
import { waitFor } from '@testing-library/dom'
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
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
        if (typeof prop === 'string' && CALLABLE.has(prop)) {
          return () => prop
        }
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

import { usePromise, type UsePromiseState } from '@molecule/app-solid'

const { Button } = await import('../components/Button.jsx')

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

const disposers: Array<() => void> = []

/**
 * Minimal consumer: the real `Button` with the real `usePromise` primitive
 * feeding the pending state to `loading`, the way a product screen wires a save
 * action.
 *
 * @param props - The app-supplied request function and optional explicit disable.
 * @returns The bookmark control.
 */
function BookmarkButton(props: { save: SaveBookmark; disabled?: boolean }): JSX.Element {
  const promise = usePromise(props.save)
  const state = (): UsePromiseState<BookmarkSnapshot> => promise[0]
  const saveBookmark = promise[1]
  const bookmarked = (): boolean => state().value?.bookmarked ?? false

  const submit = (): void => {
    // `usePromise` already records a rejection in `state.error`; this guard only
    // keeps a rejected request from surfacing as an unhandled rejection.
    void saveBookmark(!bookmarked()).catch((_error: unknown) => {})
  }

  return (
    <Button disabled={props.disabled} loading={state().status === 'pending'} onClick={submit}>
      {bookmarked() ? 'Remove bookmark' : 'Bookmark'}
    </Button>
  )
}

/**
 * Renders the bookmark control.
 *
 * @param save - The app-supplied request function.
 * @param disabled - Optional explicit disable from the caller.
 * @returns A getter for the native `<button>`.
 */
function renderBookmark(save: SaveBookmark, disabled?: boolean): () => HTMLButtonElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <BookmarkButton save={save} disabled={disabled} />, container))
  return () => {
    const control = container.querySelector('button')
    expect(control).not.toBeNull()
    return control as HTMLButtonElement
  }
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

describe('Button pending action', () => {
  it('is unavailable while the request is pending and takes a single request', async () => {
    const first = deferred<BookmarkSnapshot>()
    const save = vi.fn<SaveBookmark>(() => first.promise)
    const control = renderBookmark(save)

    control().click()

    // Clicks during the request must not reach the caller again: the native
    // control is disabled, not merely ignoring input inside a handler.
    control().click()
    control().click()
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

    control().click()
    await waitFor(() => expect(control().disabled).toBe(true))
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
    await waitFor(() => expect(control().disabled).toBe(true))

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
