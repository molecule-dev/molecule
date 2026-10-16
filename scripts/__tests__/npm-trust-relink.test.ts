import { afterEach, describe, expect, it, vi } from 'vitest'

import { relinkPackage } from '../lib/npm-trust.mjs'
import { unprovenPackages } from '../lib/untrusted.mjs'

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

afterEach(() => vi.unstubAllGlobals())

describe('unprovenPackages (2026-10-16: 15 packages on dead links the ledger called trusted)', () => {
  it('names a package npm has whose versions were all published by hand, and no other', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('hand-only'))
          return json({ versions: { '1.0.0': { _npmUser: { name: 'vialoh' } } } })
        if (url.includes('via-ci'))
          return json({
            versions: {
              '1.0.0': { _npmUser: { name: 'vialoh' } },
              '1.0.1': {
                _npmUser: { name: 'GitHub Actions', email: 'npm-oidc-no-reply@github.com' },
              },
            },
          })
        return new Response('', { status: 404 })
      }),
    )
    const out = await unprovenPackages([
      { name: '@molecule/hand-only' },
      { name: '@molecule/via-ci' },
      { name: '@molecule/never-published' },
    ])
    expect(out.map((p: { name: string }) => p.name)).toEqual(['@molecule/hand-only'])
  })
})

describe('relinkPackage', () => {
  it('revokes every listed link and adds a fresh one', async () => {
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push(`${init?.method ?? 'GET'} ${url.replace('https://registry.npmjs.org', '')}`)
        if (!init?.method) return json([{ id: 'dead-1' }, { id: 'dead-2' }])
        if (init.method === 'DELETE') return new Response(null, { status: 204 })
        return json({ ok: true }, 201)
      }),
    )
    const r = await relinkPackage('@molecule/x', { otp: '123456' })
    expect(r.outcome).toBe('relinked')
    expect(calls).toEqual([
      'GET /-/package/@molecule%2fx/trust',
      'DELETE /-/package/@molecule%2fx/trust/dead-1',
      'DELETE /-/package/@molecule%2fx/trust/dead-2',
      'POST /-/package/@molecule%2fx/trust',
    ])
  })

  it('says where to remove a link npm will not revoke, instead of calling it trusted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (!init?.method) return json([{ id: 'dead-1' }])
        if (init.method === 'DELETE') return new Response('not found', { status: 404 })
        return new Response('trusted publisher already exists', { status: 409 })
      }),
    )
    const r = await relinkPackage('@molecule/x', { otp: '123456' })
    expect(r.outcome).toBe('stuck')
    expect(r.text).toContain('https://www.npmjs.com/package/@molecule/x/access')
  })

  it('asks for a fresh code when npm wants one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('EOTP one-time password', { status: 401 })),
    )
    expect((await relinkPackage('@molecule/x', { otp: 'spent' })).outcome).toBe('needs-otp')
  })
})
