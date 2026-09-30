import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ModelEndpointSpec } from '@molecule/api-model-hosting'

import { createProvider, instanceTypeFor, statusOf, toDefinition } from '../provider.js'

const SPEC: ModelEndpointSpec = {
  name: 'laya',
  image: 'ghcr.io/acme/laya-serve:0.3.1',
  port: 8000,
  healthPath: '/health',
  env: { LAYA_PRELOAD: '1' },
  secretEnv: { LAYA_API_KEY: 'k' },
  accelerator: { kind: 'cpu' },
  region: 'eu',
  scaling: { minInstances: 0, maxInstances: 2, idleTimeoutSeconds: 600 },
  access: 'private',
  serverEnforcesAuth: true,
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const mockFetch = vi.fn()

describe('model-hosting-koyeb', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds the documented DeploymentDefinition', () => {
    expect(toDefinition(SPEC, 'fra', 'large')).toEqual({
      name: 'laya',
      type: 'WEB',
      docker: { image: SPEC.image },
      env: [
        { key: 'LAYA_PRELOAD', value: '1' },
        { key: 'LAYA_API_KEY', value: 'k' },
      ],
      ports: [{ port: 8000, protocol: 'http' }],
      routes: [{ port: 8000, path: '/' }],
      regions: ['fra'],
      instance_types: [{ type: 'large' }],
      scalings: [{ min: 0, max: 2, targets: [{ sleep_idle_delay: { value: 600 } }] }],
      health_checks: [{ grace_period: 300, http: { port: 8000, path: '/health' } }],
    })
  })

  it('picks the smallest GPU that fits, or the one named', () => {
    expect(instanceTypeFor({ ...SPEC, accelerator: { kind: 'gpu', minVramGb: 16 } }, 'large')).toBe(
      'gpu-nvidia-l4',
    )
    expect(instanceTypeFor({ ...SPEC, accelerator: { kind: 'gpu', minVramGb: 40 } }, 'large')).toBe(
      'gpu-nvidia-a100',
    )
    expect(
      instanceTypeFor(
        {
          ...SPEC,
          accelerator: { kind: 'gpu', minVramGb: 16, model: 'gpu-nvidia-rtx-4000-sff-ada' },
        },
        'large',
      ),
    ).toBe('gpu-nvidia-rtx-4000-sff-ada')
  })

  it('maps service status', () => {
    expect(statusOf('HEALTHY')).toBe('ready')
    expect(statusOf('STARTING')).toBe('deploying')
    expect(statusOf('UNHEALTHY')).toBe('failed')
    expect(statusOf('PAUSED')).toBe('scaled-to-zero')
  })

  it('refuses private access unless the server enforces its own key', async () => {
    const hosting = createProvider({ apiToken: 't' })
    await expect(hosting.deploy({ ...SPEC, serverEnforcesAuth: false })).rejects.toThrow(
      /serverEnforcesAuth/,
    )
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('deploys: find/create app, create service, poll until HEALTHY, URL from the app domain', async () => {
    const app = { id: 'app1', name: 'laya', domains: [{ name: 'laya-acme.koyeb.app' }] }
    mockFetch
      .mockResolvedValueOnce(json(200, { apps: [] }))
      .mockResolvedValueOnce(json(200, { app }))
      .mockResolvedValueOnce(json(200, { services: [] }))
      .mockResolvedValueOnce(
        json(200, { service: { id: 's1', name: 'laya', app_id: 'app1', status: 'STARTING' } }),
      )
      .mockResolvedValueOnce(
        json(200, { service: { id: 's1', name: 'laya', app_id: 'app1', status: 'STARTING' } }),
      )
      .mockResolvedValueOnce(
        json(200, { service: { id: 's1', name: 'laya', app_id: 'app1', status: 'HEALTHY' } }),
      )
      .mockResolvedValueOnce(json(200, { app }))
    const ep = await createProvider({ apiToken: 't', pollIntervalMs: 1 }).deploy(SPEC)
    expect(ep).toMatchObject({
      id: 's1',
      url: 'https://laya-acme.koyeb.app',
      status: 'ready',
      region: 'fra',
    })

    const calls = mockFetch.mock.calls.map(([url, init]) => `${init.method} ${url}`)
    expect(calls.slice(0, 4)).toEqual([
      'GET https://app.koyeb.com/v1/apps?name=laya',
      'POST https://app.koyeb.com/v1/apps',
      'GET https://app.koyeb.com/v1/services?app_id=app1&name=laya',
      'POST https://app.koyeb.com/v1/services',
    ])
    expect(mockFetch.mock.calls[0]![1].headers.authorization).toBe('Bearer t')
    const create = JSON.parse(mockFetch.mock.calls[3]![1].body)
    expect(create.app_id).toBe('app1')
    expect(create.definition.instance_types).toEqual([{ type: 'large' }])
  })

  it('updates an existing service with PUT', async () => {
    const app = { id: 'app1', name: 'laya', domains: [{ name: 'laya-acme.koyeb.app' }] }
    const svc = { id: 's1', name: 'laya', app_id: 'app1', status: 'HEALTHY' }
    mockFetch
      .mockResolvedValueOnce(json(200, { apps: [app] }))
      .mockResolvedValueOnce(json(200, { services: [svc] }))
      .mockResolvedValueOnce(json(200, { service: svc }))
      .mockResolvedValueOnce(json(200, { service: svc }))
      .mockResolvedValueOnce(json(200, { app }))
    await createProvider({ apiToken: 't', pollIntervalMs: 1 }).deploy(SPEC)
    const [url, init] = mockFetch.mock.calls[2]!
    expect(`${init.method} ${url}`).toBe('PUT https://app.koyeb.com/v1/services/s1')
    expect(Object.keys(JSON.parse(init.body))).toEqual(['definition'])
  })

  it('remove deletes the app; authHeaders is empty', async () => {
    mockFetch
      .mockResolvedValueOnce(json(200, { service: { id: 's1', name: 'laya', app_id: 'app1' } }))
      .mockResolvedValueOnce(json(200, {}))
    const hosting = createProvider({ apiToken: 't' })
    await hosting.remove('s1')
    expect(`${mockFetch.mock.calls[1]![1].method} ${mockFetch.mock.calls[1]![0]}`).toBe(
      'DELETE https://app.koyeb.com/v1/apps/app1',
    )
    expect(await hosting.authHeaders('s1')).toEqual({})
  })

  it('names the missing token', async () => {
    vi.stubEnv('KOYEB_API_TOKEN', '')
    await expect(createProvider().get('s1')).rejects.toThrow(/KOYEB_API_TOKEN/)
    vi.unstubAllEnvs()
  })
})
