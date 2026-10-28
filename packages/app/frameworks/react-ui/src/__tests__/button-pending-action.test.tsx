// @vitest-environment jsdom
/**
 * Owning behavior tests for `Button` as an async-action control: while
 * `loading` is set the real `<button>` element must itself be unavailable
 * (`disabled` + `aria-busy`), so a second click cannot reach the caller's
 * request function, and the control must come back when the request settles —
 * resolved or rejected. An explicit `disabled` stays authoritative on its own.
 *
 * The pending state is the real `usePromise` hook from `@molecule/app-react`
 * (an existing peer dependency of this package) and the request is a deferred
 * local fake. The domain (saving a bookmark) is deliberately generic: the rule
 * belongs to the shared component, not to one application.
 *
 * @module
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePromise } from '@molecule/app-react'
import type { UIClassMap } from '@molecule/app-ui'
import { setClassMap } from '@molecule/app-ui'

import { Button } from '../components/Button.js'

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

const CALLABLE = new Set(['button', 'spinner', 'cn'])
const classMap = new Proxy(
  {},
  {
    get: (_target, prop: string) => {
      if (prop === 'cn') {
        return (...parts: unknown[]) => parts.flat(Infinity).filter(Boolean).join(' ')
      }
      if (CALLABLE.has(prop)) return () => prop
      return prop
    },
  },
) as UIClassMap

/**
 * Minimal consumer: the real `Button` with the real `usePromise` hook feeding
 * the pending state to `loading`, the way a product screen wires a save action.
 *
 * @param props - The app-supplied request function and optional explicit disable.
 * @returns The bookmark control.
 */
function BookmarkButton({ save, disabled }: { save: SaveBookmark; disabled?: boolean }) {
  const [state, saveBookmark] = usePromise(save)
  const bookmarked = state.value?.bookmarked ?? false

  const submit = () => {
    // `usePromise` already records a rejection in `state.error`; this guard only
    // keeps a rejected request from surfacing as an unhandled rejection.
    void saveBookmark(!bookmarked).catch((_error: unknown) => {})
  }

  return createElement(
    Button,
    { disabled, loading: state.status === 'pending', onClick: submit },
    bookmarked ? 'Remove bookmark' : 'Bookmark',
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
  const view = render(createElement(BookmarkButton, { save, disabled }))
  return () => view.getByRole('button') as HTMLButtonElement
}

beforeEach(() => {
  setClassMap(classMap)
})

afterEach(cleanup)

describe('Button pending action', () => {
  it('is unavailable while the request is pending and takes a single request', async () => {
    const first = deferred<BookmarkSnapshot>()
    const save = vi.fn<SaveBookmark>(() => first.promise)
    const control = renderBookmark(save)

    fireEvent.click(control())

    // Clicks during the request must not reach the caller again: the native
    // control is disabled, not merely ignoring input inside a handler.
    fireEvent.click(control())
    fireEvent.click(control())
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

    fireEvent.click(control())
    await waitFor(() => expect(control().disabled).toBe(true))
    fireEvent.click(control())
    expect(save).toHaveBeenCalledTimes(1)

    first.resolve({ bookmarked: true })
    await waitFor(() => expect(control().disabled).toBe(false))
    expect(control().getAttribute('aria-busy')).toBe('false')

    // The control accepts input again, and the value it sends comes from the
    // server's answer rather than from an optimistic local toggle.
    fireEvent.click(control())
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

    fireEvent.click(control())
    await waitFor(() => expect(control().disabled).toBe(true))

    failing.reject(new Error('bookmark service unavailable'))
    await waitFor(() => expect(control().disabled).toBe(false))
    expect(control().getAttribute('aria-busy')).toBe('false')

    fireEvent.click(control())
    expect(save).toHaveBeenCalledTimes(2)

    retrying.resolve({ bookmarked: true })
    await waitFor(() => expect(control().disabled).toBe(false))
    expect(save).toHaveBeenLastCalledWith(true)
  })

  it('stays unavailable when the caller disables it explicitly', () => {
    const save = vi.fn<SaveBookmark>(async () => ({ bookmarked: true }))
    const control = renderBookmark(save, true)

    expect(control().disabled).toBe(true)
    fireEvent.click(control())
    fireEvent.click(control())
    expect(save).not.toHaveBeenCalled()
  })
})
