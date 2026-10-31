import { describe, expect, it, vi } from 'vitest'

import type { FlyioConfig } from '../types.js'
import { createFetchDouble, mockLogger } from './helpers.js'

vi.mock('@molecule/api-bond', () => ({ getLogger: () => mockLogger }))
vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}))

const { FlyApiClient } = await import('../api.js')
const { createProvider } = await import('../provider.js')

const PROJECT_ID = 'a3f1c0de-0000-4000-8000-000000000001'
const APP = `mol-sandbox-${PROJECT_ID}`

function makeProvider(double: ReturnType<typeof createFetchDouble>, config: FlyioConfig = {}) {
  const client = new FlyApiClient({
    token: () => 'tok',
    baseUrl: 'https://api.machines.dev/v1',
    fetchImpl: double.fetch,
    sleep: async () => {},
  })
  return createProvider({ orgSlug: 'acme', region: 'iad', ...config }, client)
}

describe('round-four lifecycle regressions', () => {
  it('never reaps a fresh Machine belonging to a create that is still waiting for boot', async () => {
    const double = createFetchDouble()
    let releaseWait!: () => void
    const wait = new Promise<void>((resolve) => {
      releaseWait = resolve
    })
    let machineCreated = false
    const baseFetch = double.fetch
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method ?? 'GET').toUpperCase()
      if (method === 'GET' && url.endsWith(`/apps/${APP}`)) {
        return {
          status: 200,
          headers: { get: () => null },
          text: async () => JSON.stringify({ name: APP, network: APP }),
        } as unknown as Response
      }
      if (method === 'GET' && url.endsWith(`/apps/${APP}/machines`)) {
        return {
          status: 200,
          headers: { get: () => null },
          text: async () =>
            JSON.stringify(
              machineCreated
                ? [
                    {
                      id: 'm1',
                      state: 'starting',
                      created_at: new Date().toISOString(),
                      config: { metadata: { 'molecule-sandbox.managed': 'true' } },
                    },
                  ]
                : [],
            ),
        } as unknown as Response
      }
      if (method === 'POST' && url.endsWith(`/apps/${APP}/machines`)) {
        const id = machineCreated ? 'm2' : 'm1'
        machineCreated = true
        return {
          status: 200,
          headers: { get: () => null },
          text: async () => JSON.stringify({ id, state: 'starting' }),
        } as unknown as Response
      }
      if (method === 'GET' && url.includes('/wait')) {
        if (url.includes('/m1/')) await wait
        return {
          status: 200,
          headers: { get: () => null },
          text: async () => '{}',
        } as unknown as Response
      }
      return baseFetch(input, init)
    }) as unknown as typeof fetch

    const provider = makeProvider(double)
    const first = provider.create({ projectId: PROJECT_ID })
    await vi.waitFor(() => expect(machineCreated).toBe(true))
    await provider.create({ projectId: PROJECT_ID })
    releaseWait()
    await first

    expect(double.matching(`DELETE /apps/${APP}/machines/m1`)).toHaveLength(0)
  })

  it('does not replay an ambiguous volume POST after three reads miss the volume Fly created', async () => {
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { body: { name: APP, network: APP } })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`POST /apps/${APP}/volumes`, { body: { id: 'v1', name: 'mol_abc' } })
      .on(`POST /apps/${APP}/volumes`, { body: { id: 'v2', name: 'mol_abc' } })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm1', state: 'started' } })
    const baseFetch = double.fetch
    let volumePosts = 0
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const isVolumePost =
        String(input).endsWith(`/apps/${APP}/volumes`) &&
        (init?.method ?? 'GET').toUpperCase() === 'POST'
      const response = await baseFetch(input, init)
      if (isVolumePost && ++volumePosts === 1) throw new Error('response lost')
      return response
    }) as unknown as typeof fetch

    await expect(
      makeProvider(double).create({ projectId: PROJECT_ID, volumeName: 'mol-abc' }),
    ).rejects.toThrow()
    expect(volumePosts).toBe(1)
    expect(double.matching(`POST /apps/${APP}/machines`)).toHaveLength(0)
  })

  it('never reaps old or fresh volumes from inside create', async () => {
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { body: { name: APP, network: APP } })
      .on(`GET /apps/${APP}/volumes`, {
        body: [
          {
            id: 'old',
            name: 'mol_abc_old',
            created_at: new Date(Date.now() - 300_000).toISOString(),
          },
          { id: 'fresh', name: 'mol_abc_fresh', created_at: new Date().toISOString() },
        ],
      })
      .on(`POST /apps/${APP}/volumes`, { body: { id: 'v1', name: 'unique' } })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm1', state: 'started' } })

    await makeProvider(double).create({ projectId: PROJECT_ID, volumeName: 'mol-abc' })

    expect(double.matching(`DELETE /apps/${APP}/volumes/old`)).toHaveLength(0)
    expect(double.matching(`DELETE /apps/${APP}/volumes/fresh`)).toHaveLength(0)
    expect(double.matching(`POST /apps/${APP}/volumes`)).toHaveLength(1)
  })

  it('retries a definite volume-lag rejection against the same volume', async () => {
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { body: { name: APP, network: APP } })
      .on(`POST /apps/${APP}/volumes`, { body: { id: 'v1', name: 'unique' } })
      .on(`POST /apps/${APP}/machines`, { status: 400, body: { error: 'volume not found' } })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm1', state: 'started' } })

    await expect(
      makeProvider(double).create({ projectId: PROJECT_ID, volumeName: 'mol-abc' }),
    ).resolves.toMatchObject({ id: `${APP}:m1` })
    expect(double.matching(`POST /apps/${APP}/volumes`)).toHaveLength(1)
    expect(double.matching(`POST /apps/${APP}/machines`)).toHaveLength(2)
  })

  it('adopts an ambiguously created Machine by its attempt identity without replaying POST', async () => {
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { body: { name: APP, network: APP } })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm1', state: 'started' } })
    const baseFetch = double.fetch
    let posts = 0
    let attempt = ''
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method ?? 'GET').toUpperCase()
      if (method === 'POST' && url.endsWith(`/apps/${APP}/machines`)) {
        posts++
        attempt = (JSON.parse(String(init?.body)) as { name: string }).name
        await baseFetch(input, init)
        throw new Error('response lost')
      }
      if (method === 'GET' && url.endsWith(`/apps/${APP}/machines`)) {
        return {
          status: 200,
          headers: { get: () => null },
          text: async () =>
            JSON.stringify(attempt ? [{ id: 'm1', name: attempt, state: 'started' }] : []),
        } as unknown as Response
      }
      return baseFetch(input, init)
    }) as unknown as typeof fetch

    await expect(makeProvider(double).create({ projectId: PROJECT_ID })).resolves.toMatchObject({
      id: `${APP}:m1`,
    })
    expect(posts).toBe(1)
  })

  it('force-deletes an exclusively owned app so a running Machine cannot strand it', async () => {
    const double = createFetchDouble().on(`DELETE /apps/${APP}?force=true`, { status: 204 })
    const provider = makeProvider(double) as ReturnType<typeof makeProvider> & {
      destroyApp(projectId: string): Promise<void>
    }

    await provider.destroyApp(PROJECT_ID)

    const deletion = double.calls.find(
      (call) => call.method === 'DELETE' && call.path.startsWith(`/apps/${APP}`),
    )
    expect(deletion?.path).toBe(`/apps/${APP}?force=true`)
  })
})
