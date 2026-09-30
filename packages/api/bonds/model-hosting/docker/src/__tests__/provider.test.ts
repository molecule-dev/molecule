import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ModelEndpointSpec } from '@molecule/api-model-hosting'

import { createProvider, splitImage, toCreateBody } from '../provider.js'
import type { DockerResponse } from '../types.js'

const SPEC: ModelEndpointSpec = {
  name: 'laya',
  image: 'ghcr.io/acme/laya-serve:0.3.1',
  port: 8000,
  healthPath: '/health',
  env: { LAYA_PRELOAD: '1' },
  accelerator: { kind: 'gpu', minVramGb: 16 },
  region: 'local',
  scaling: { minInstances: 1, maxInstances: 1, idleTimeoutSeconds: 0 },
  access: 'public',
}

const RUNNING = {
  Id: 'abc',
  Name: '/molecule-model-laya',
  State: { Status: 'running', Running: true },
  Config: {
    Labels: { 'molecule.model-hosting.name': 'laya', 'molecule.model-hosting.port': '8000' },
  },
  HostConfig: { DeviceRequests: [{ Count: 1 }] },
  NetworkSettings: { Ports: { '8000/tcp': [{ HostIp: '127.0.0.1', HostPort: '49153' }] } },
}

const ok = (body: unknown = ''): DockerResponse => ({
  status: 200,
  body: typeof body === 'string' ? body : JSON.stringify(body),
})

const mockFetch = vi.fn()

describe('model-hosting-docker', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('splits image references, keeping a registry port', () => {
    expect(splitImage('ghcr.io/acme/laya-serve:0.3.1')).toEqual({
      fromImage: 'ghcr.io/acme/laya-serve',
      tag: '0.3.1',
    })
    expect(splitImage('localhost:5000/laya')).toEqual({
      fromImage: 'localhost:5000/laya',
      tag: 'latest',
    })
    expect(splitImage('laya@sha256:abc')).toEqual({ fromImage: 'laya@sha256:abc', tag: '' })
  })

  it('builds a create body with an NVIDIA device request and a loopback port binding', () => {
    expect(toCreateBody(SPEC, '127.0.0.1', 1)).toMatchObject({
      Image: SPEC.image,
      Env: ['LAYA_PRELOAD=1'],
      ExposedPorts: { '8000/tcp': {} },
      Labels: { 'managed-by': 'molecule-model-hosting', 'molecule.model-hosting.name': 'laya' },
      HostConfig: {
        PortBindings: { '8000/tcp': [{ HostIp: '127.0.0.1', HostPort: '' }] },
        RestartPolicy: { Name: 'unless-stopped' },
        DeviceRequests: [{ Driver: 'nvidia', Count: 1, Capabilities: [['gpu']] }],
      },
    })
    expect(
      toCreateBody({ ...SPEC, accelerator: { kind: 'cpu' } }, '0.0.0.0', 1).HostConfig,
    ).not.toHaveProperty('DeviceRequests')
  })

  it('refuses scale-to-zero on deploy (one always-on container)', async () => {
    const transport = vi.fn()
    await expect(
      createProvider({ transport }).deploy({
        ...SPEC,
        scaling: { minInstances: 0, maxInstances: 1, idleTimeoutSeconds: 0 },
      }),
    ).rejects.toThrow(/cannot scale to zero/)
    expect(transport).not.toHaveBeenCalled()
  })

  it('deploys: pull, replace, create, start, then waits on the health path', async () => {
    const transport = vi
      .fn()
      .mockResolvedValueOnce(ok('{"status":"Pulling"}\n{"status":"Done"}'))
      .mockResolvedValueOnce({ status: 404, body: '' })
      .mockResolvedValueOnce(ok({ Id: 'abc', Warnings: [] }))
      .mockResolvedValueOnce({ status: 204, body: '' })
      .mockResolvedValueOnce(ok(RUNNING))
      .mockResolvedValueOnce(ok(RUNNING))
    mockFetch
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
    const ep = await createProvider({ transport, pollIntervalMs: 1 }).deploy(SPEC)
    expect(ep).toMatchObject({
      id: 'molecule-model-laya',
      url: 'http://localhost:49153',
      status: 'ready',
    })
    expect(transport.mock.calls.map(([m, p]) => `${m} ${p}`)).toEqual([
      'POST /images/create?fromImage=ghcr.io%2Facme%2Flaya-serve&tag=0.3.1',
      'DELETE /containers/molecule-model-laya?force=true',
      'POST /containers/create?name=molecule-model-laya',
      'POST /containers/molecule-model-laya/start',
      'GET /containers/molecule-model-laya/json',
      'GET /containers/molecule-model-laya/json',
    ])
    expect(mockFetch).toHaveBeenLastCalledWith('http://localhost:49153/health')
  })

  it('surfaces a pull error hidden in the 200 progress stream', async () => {
    const transport = vi
      .fn()
      .mockResolvedValueOnce(ok('{"status":"Pulling"}\n{"error":"manifest unknown"}'))
    await expect(createProvider({ transport }).deploy(SPEC)).rejects.toThrow(/manifest unknown/)
  })

  it('scale stops or starts the container; lists by label', async () => {
    const transport = vi
      .fn()
      .mockResolvedValueOnce({ status: 204, body: '' })
      .mockResolvedValueOnce(ok({ ...RUNNING, State: { Status: 'exited', Running: false } }))
      .mockResolvedValueOnce(ok([{ Names: ['/molecule-model-laya'] }]))
      .mockResolvedValueOnce(ok(RUNNING))
    const hosting = createProvider({ transport })
    const stopped = await hosting.scale('molecule-model-laya', {
      minInstances: 0,
      maxInstances: 1,
      idleTimeoutSeconds: 0,
    })
    expect(stopped.status).toBe('scaled-to-zero')
    expect(transport.mock.calls[0]!.slice(0, 2)).toEqual([
      'POST',
      '/containers/molecule-model-laya/stop',
    ])
    const list = await hosting.list()
    expect(list.map((e) => e.id)).toEqual(['molecule-model-laya'])
    expect(decodeURIComponent(transport.mock.calls[2]![1])).toContain(
      '{"label":["managed-by=molecule-model-hosting"]}',
    )
  })
})
