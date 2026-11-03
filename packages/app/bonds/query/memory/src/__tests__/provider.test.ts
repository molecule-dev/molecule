import { describe, expect, it, vi } from 'vitest'

import { createProvider, provider } from '../provider.js'
import { describeQueryClient } from './describeQueryClient.js'

const tick = () => new Promise<void>((r) => setTimeout(r, 0))

/** A fetch that settles only when its signal aborts, recording the signal it was given. */
function pendingFetch(signals: AbortSignal[]): (signal: AbortSignal) => Promise<string> {
  return (signal) => {
    signals.push(signal)
    return new Promise<string>((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    })
  }
}

describe('memory provider', () => {
  it('is named and creates independent clients', () => {
    expect(provider.name).toBe('memory')
    const a = provider.createClient()
    const b = createProvider().createClient()
    a.set(['k'], 1)
    expect(b.get(['k'])).toBeUndefined()
  })
})

describe('memory provider abort semantics', () => {
  it('aborts the in-flight fetch when its last observer unsubscribes', async () => {
    const client = createProvider().createClient()
    const signals: AbortSignal[] = []
    const off = client.subscribe({ key: ['doc', 'a'], fetch: pendingFetch(signals) }, () => {})
    await tick()
    expect(signals).toHaveLength(1)
    expect(signals[0].aborted).toBe(false)
    off()
    expect(signals[0].aborted).toBe(true)
  })

  it('keeps the fetch alive while another observer still watches it', async () => {
    const client = createProvider().createClient()
    const signals: AbortSignal[] = []
    const fetch = pendingFetch(signals)
    const offA = client.subscribe({ key: ['doc', 'b'], fetch }, () => {})
    const offB = client.subscribe({ key: ['doc', 'b'], fetch }, () => {})
    await tick()
    expect(signals).toHaveLength(1)
    offA()
    expect(signals[0].aborted).toBe(false)
    offB()
    expect(signals[0].aborted).toBe(true)
  })

  it('does not abort a fetch a direct caller still awaits', async () => {
    const client = createProvider().createClient()
    const signals: AbortSignal[] = []
    const fetch = pendingFetch(signals)
    const demanded = client.fetch({ key: ['doc', 'c'], fetch })
    const off = client.subscribe({ key: ['doc', 'c'], fetch }, () => {})
    await tick()
    off()
    expect(signals[0].aborted).toBe(false)
    client.clear()
    await expect(demanded).rejects.toThrow()
  })

  it('aborts an observer-only fetch when set supersedes it', async () => {
    const client = createProvider().createClient()
    const signals: AbortSignal[] = []
    const seen: string[] = []
    const off = client.subscribe({ key: ['doc', 'set'], fetch: pendingFetch(signals) }, (state) =>
      seen.push(state.data ?? '-'),
    )
    await tick()

    client.set(['doc', 'set'], 'mutation')
    expect(signals[0].aborted).toBe(true)
    expect(client.getState(['doc', 'set'])).toMatchObject({
      data: 'mutation',
      status: 'success',
      isFetching: false,
    })
    await tick()
    expect(client.get(['doc', 'set'])).toBe('mutation')
    expect(seen.at(-1)).toBe('mutation')
    off()
  })

  it('lets a direct caller receive its older result without committing it after set', async () => {
    const client = createProvider().createClient()
    const signals: AbortSignal[] = []
    let resolveFetch!: (value: string) => void
    const demanded = client.fetch({
      key: ['doc', 'demanded'],
      fetch: (signal) => {
        signals.push(signal)
        return new Promise<string>((resolve) => {
          resolveFetch = resolve
        })
      },
    })

    client.set(['doc', 'demanded'], 'mutation')
    expect(signals[0].aborted).toBe(false)
    expect(client.getState(['doc', 'demanded']).isFetching).toBe(false)
    resolveFetch('stale')
    await expect(demanded).resolves.toBe('stale')
    expect(client.get(['doc', 'demanded'])).toBe('mutation')
  })

  it('clear aborts a superseded fetch kept alive for a direct caller', async () => {
    const client = createProvider().createClient()
    const signals: AbortSignal[] = []
    const demanded = client.fetch({ key: ['doc', 'clear'], fetch: pendingFetch(signals) })
    await tick()
    client.set(['doc', 'clear'], 'mutation')
    expect(signals[0].aborted).toBe(false)

    client.clear()
    expect(signals[0].aborted).toBe(true)
    await expect(demanded).rejects.toThrow()
    expect(client.get(['doc', 'clear'])).toBeUndefined()
  })

  it('does not let an old direct caller protect a newer observer-only fetch', async () => {
    const client = createProvider().createClient()
    let resolveOld!: (value: string) => void
    const old = client.fetch({
      key: ['doc', 'generation'],
      fetch: () =>
        new Promise<string>((resolve) => {
          resolveOld = resolve
        }),
    })
    client.set(['doc', 'generation'], 'mutation')
    client.invalidate(['doc', 'generation'])
    const signals: AbortSignal[] = []
    const off = client.subscribe(
      { key: ['doc', 'generation'], fetch: pendingFetch(signals) },
      () => {},
    )
    await tick()

    off()
    expect(signals[0].aborted).toBe(true)
    resolveOld('stale')
    await expect(old).resolves.toBe('stale')
    expect(client.get(['doc', 'generation'])).toBe('mutation')
  })

  it('leaves no stuck error: a later observer refetches after an abort', async () => {
    const client = createProvider().createClient()
    const signals: AbortSignal[] = []
    const off = client.subscribe({ key: ['doc', 'd'], fetch: pendingFetch(signals) }, () => {})
    await tick()
    off()
    expect(client.getState(['doc', 'd']).status).toBe('idle')
    const fetch = vi.fn(async () => 'loaded')
    const seen: string[] = []
    const offAgain = client.subscribe({ key: ['doc', 'd'], fetch }, (state) =>
      seen.push(`${state.status}:${state.data ?? '-'}`),
    )
    await tick()
    await tick()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(seen.at(-1)).toBe('success:loaded')
    offAgain()
  })
})

describeQueryClient('memory', (config) => provider.createClient(config))
