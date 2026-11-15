/**
 * The 2FA code gate trust:new runs every npm call through (scripts/lib/otp-gate.mjs),
 * driven with a fake npm and a hand-released clock, so the order of calls is exact.
 */
import { describe, expect, it } from 'vitest'

import { createOtpGate, npmTwoFactorFailure, TwoFactorRateLimited } from '../lib/otp-gate.mjs'

type Answer = 'ok' | 'otp' | 'rate-limited'

/** Lets every pending promise callback run. */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 20; i++) await Promise.resolve()
}

/**
 * A gate over a scripted npm: `answers[code]` lists what npm says to each call carrying
 * that code (the last answer repeats). Calls stay open until `release()`. `clock.t` is
 * the gate's clock; by default a code never gets old.
 */
function harness(
  answers: Record<string, Answer[]>,
  codes: string[],
  { maxRateLimits = 5, freshMs = Infinity }: { maxRateLimits?: number; freshMs?: number } = {},
) {
  const sent: Array<{ code: string; open: number }> = []
  const fetches: string[] = []
  const pauses: number[] = []
  const pending: Array<() => void> = []
  const wakes: Array<() => void> = []
  const clock = { t: 0 }
  let open = 0
  const gate = createOtpGate({
    fetchCode: async (_label: string, why: string) => {
      fetches.push(why)
      const next = codes.shift()
      if (!next) throw new Error('no code left')
      return next
    },
    pauseMs: 1000,
    maxRateLimits,
    freshMs,
    now: () => clock.t,
    sleep: (ms: number) =>
      new Promise<void>((resolve) => {
        pauses.push(ms)
        wakes.push(resolve)
      }),
    log: () => {},
  })
  const call = (code: string): Promise<Answer> => {
    open++
    sent.push({ code, open })
    const list = answers[code] ?? ['ok']
    const answer = list.length > 1 ? list.shift()! : list[0]
    return new Promise((resolve) =>
      pending.push(() => {
        open--
        resolve(answer)
      }),
    )
  }
  const run = (): Promise<Answer> =>
    gate.run('pkg', call, (a: Answer) => (a === 'ok' ? null : a)) as Promise<Answer>
  /** Answers every open call. */
  const release = async (): Promise<void> => {
    await flush()
    while (pending.length) pending.shift()!()
    await flush()
  }
  /** Ends the current pause. */
  const wake = async (): Promise<void> => {
    await flush()
    wakes.shift()?.()
    await flush()
  }
  return { gate, run, release, wake, sent, fetches, pauses, clock }
}

describe('npmTwoFactorFailure', () => {
  it('reads "rate limited otp" as a rate limit, not a refused code (OLD MUSTFAIL: matched otp)', () => {
    const text =
      'npm error code E429\nnpm error 429 Too Many Requests - PUT https://registry.npmjs.org/@molecule%2fx - Could not authenticate owner: rate limited otp'
    expect(npmTwoFactorFailure({ text })).toBe('rate-limited')
    expect(npmTwoFactorFailure({ status: 429, text: '{}' })).toBe('rate-limited')
  })

  it('reads a refused or missing code as otp, and anything else as null', () => {
    expect(npmTwoFactorFailure({ text: 'npm error code EOTP' })).toBe('otp')
    expect(npmTwoFactorFailure({ status: 401, text: '{"error":"otp invalid"}' })).toBe('otp')
    expect(npmTwoFactorFailure({ status: 403, text: 'Forbidden by WAF' })).toBeNull()
    expect(npmTwoFactorFailure({ text: '' })).toBeNull()
  })
})

describe('createOtpGate', () => {
  it('sends a new code on one call first, then lets the rest run together', async () => {
    const h = harness({}, ['111111'])
    const runs = [h.run(), h.run(), h.run()]
    await flush()
    expect(h.sent.map((s) => s.open)).toEqual([1])
    await h.release()
    expect(h.sent.map((s) => s.open)).toEqual([1, 1, 2])
    await h.release()
    expect(await Promise.all(runs)).toEqual(['ok', 'ok', 'ok'])
    expect(h.fetches).toEqual(['first'])
  })

  it('never starts a call with a code npm refused, and asks once for the calls it refused together', async () => {
    const h = harness({ '111111': ['ok', 'otp'] }, ['111111', '222222'])
    const runs = [h.run(), h.run(), h.run(), h.run()]
    await h.release() // the probe: accepted
    await h.release() // three together: all refused
    await h.release() // the probe with the new code
    await h.release() // the other two
    expect(await Promise.all(runs)).toEqual(['ok', 'ok', 'ok', 'ok'])
    expect(h.fetches).toEqual(['first', 'rejected'])
    // One probe and three together with the old code; nothing more was sent with it.
    expect(h.sent.filter((s) => s.code === '111111')).toHaveLength(4)
    expect(h.sent.filter((s) => s.code === '222222').map((s) => s.open)).toEqual([1, 1, 2])
  })

  it('lets calls share a code only while it is fresh, so its expiry refuses one call (OLD MUSTFAIL: three refused together)', async () => {
    const h = harness({ '111111': ['ok', 'ok', 'otp'] }, ['111111', '222222'], { freshMs: 1000 })
    const runs = [h.run(), h.run(), h.run(), h.run(), h.run()]
    await flush()
    h.clock.t = 1000 // the code is old before its first call answers
    await h.release() // the probe: accepted
    await h.release() // alone: accepted
    await h.release() // alone: refused, the code died
    await h.release() // the new code's probe
    await h.release() // the other two together: the new code is fresh
    expect(await Promise.all(runs)).toEqual(['ok', 'ok', 'ok', 'ok', 'ok'])
    expect(h.sent.filter((s) => s.code === '111111').map((s) => s.open)).toEqual([1, 1, 1])
    expect(h.sent.filter((s) => s.code === '222222').map((s) => s.open)).toEqual([1, 1, 2])
    expect(h.fetches).toEqual(['first', 'rejected'])
  })

  it('pauses every call on a rate limit and asks for nothing until the pause ends (OLD MUSTFAIL: asked at once)', async () => {
    const h = harness({ '111111': ['ok', 'rate-limited'] }, ['111111', '222222'])
    const runs = [h.run(), h.run(), h.run()]
    await h.release() // probe accepted
    await h.release() // two together: rate limited
    expect(h.pauses).toEqual([1000])
    const sentDuringPause = h.sent.length
    await h.release()
    expect(h.sent.length).toBe(sentDuringPause)
    expect(h.fetches).toEqual(['first'])
    await h.wake()
    expect(h.fetches).toEqual(['first', 'rate-limited'])
    await h.release()
    await h.release()
    expect(await Promise.all(runs)).toEqual(['ok', 'ok', 'ok'])
  })

  it('doubles the pause while npm stays locked, and starts over after a success', async () => {
    const h = harness(
      { '111111': ['rate-limited'], '222222': ['rate-limited'], '333333': ['ok'] },
      ['111111', '222222', '333333', '444444'],
    )
    const first = h.run()
    await h.release()
    await h.wake()
    await h.release()
    await h.wake()
    await h.release()
    expect(await first).toBe('ok')
    expect(h.pauses).toEqual([1000, 2000])
    // A later lock starts from the first pause again.
    const again = harness({ '444444': ['rate-limited', 'ok'] }, ['444444', '555555'])
    const second = again.run()
    await again.release()
    await again.wake()
    await again.release()
    expect(await second).toBe('ok')
    expect(again.pauses).toEqual([1000])
  })

  it('gives up after maxRateLimits locks in a row, for every waiting call', async () => {
    const h = harness(
      { '111111': ['ok', 'rate-limited'], '222222': ['rate-limited'] },
      ['111111', '222222', '333333'],
      { maxRateLimits: 1 },
    )
    const runs = [h.run(), h.run()].map((p) => p.catch((error: unknown) => error))
    await h.release() // probe ok
    await h.release() // rate limited: first pause
    await h.wake()
    await h.release() // still locked: over the limit
    const [ok, stopped] = await Promise.all(runs)
    expect(ok).toBe('ok')
    expect(stopped).toBeInstanceOf(TwoFactorRateLimited)
    await expect(h.run()).rejects.toBeInstanceOf(TwoFactorRateLimited)
  })

  it('makes a code request that failed final, so no call asks again after a no', async () => {
    const h = harness({ '111111': ['ok', 'otp'] }, ['111111'])
    const runs = [h.run(), h.run(), h.run()].map((p) => p.catch((error: unknown) => error))
    await h.release()
    await h.release()
    const results = await Promise.all(runs)
    expect(results[0]).toBe('ok')
    expect(results.slice(1).every((r) => r instanceof Error)).toBe(true)
    expect(h.fetches).toEqual(['first', 'rejected'])
    await expect(h.run()).rejects.toThrow('no code left')
    expect(h.fetches).toEqual(['first', 'rejected'])
  })
})
