/**
 * X1 xr-molecule-flash-m97 `+48:05`: `@molecule/app-http`'s auth gate held the request the
 * gate's own restore makes, so a store that registered its restore as the gate waited on
 * itself and every request stalled the full timeout.
 *
 * `{ skipAuthGate: true }` is the way out, and the Axios provider has to carry that molecule
 * request option onto the Axios config for its single request interceptor to see it. This
 * suite drives a REAL Axios instance (not the captured-interceptor mock in `index.test.ts`)
 * with a local adapter, which is what proves the option survives Axios's own config merge —
 * a mock cannot.
 */
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'

import { setAuthGate } from '@molecule/app-http'

import { createAxiosClient } from '../provider.js'

/** Records the requests that reached the transport, in order. */
const recordingAdapter =
  (seen: string[]) =>
  (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const response: AxiosResponse = {
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
    seen.push(`${config.method?.toUpperCase()} ${config.url}`)
    return Promise.resolve(response)
  }

const client = (seen: string[]) =>
  createAxiosClient({
    baseURL: 'http://api.test',
    axiosConfig: { adapter: recordingAdapter(seen) },
  })

/** A promise this test settles by hand. */
const deferred = (): { promise: Promise<void>; resolve: () => void } => {
  let resolve!: () => void
  return { promise: new Promise<void>((res) => (resolve = res)), resolve }
}

const settled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 10))

afterEach(() => {
  setAuthGate(null)
})

describe('skipAuthGate through the Axios provider', () => {
  it('sends a request marked skipAuthGate without waiting for the gate', async () => {
    const seen: string[] = []
    setAuthGate(() => new Promise<void>(() => {}))
    const http = client(seen)

    const request = http.get('/users/me', { skipAuthGate: true })
    const started = Date.now()
    await settled()

    // On the wire while the gate is still pending — not held for the bound and then sent.
    expect(seen).toEqual(['GET /users/me'])
    await request
    expect(Date.now() - started).toBeLessThan(1_000)
  })

  it('still holds a request that does not opt out', async () => {
    const seen: string[] = []
    const gate = deferred()
    setAuthGate(() => gate.promise)

    const held = client(seen).get('/profiles/alice')
    await settled()
    expect(seen).toEqual([])

    gate.resolve()
    await held
    expect(seen).toEqual(['GET /profiles/alice'])
  })

  it('does not stall the page when the gate waits for its own restore request (m97 shape)', async () => {
    // The app's store memoizes its restore, so the gate hands out ONE promise whose request goes
    // through the gated client. Without the opt-out that request is held, the gate cannot settle,
    // and every request the gate holds stalls the full timeout — the m97 run read it as
    // "noticeably slower, the deadlock was throttling everything".
    const seen: string[] = []
    const http = client(seen)
    let restore: Promise<void> | null = null
    setAuthGate(() => {
      restore ??= http.get('/users/me', { skipAuthGate: true }).then(() => undefined)
      return restore
    })

    const started = Date.now()
    await http.get('/profiles/alice')
    await http.get('/feed')

    expect(seen).toEqual(['GET /users/me', 'GET /profiles/alice', 'GET /feed'])
    expect(Date.now() - started).toBeLessThan(1_000)
  })
})
