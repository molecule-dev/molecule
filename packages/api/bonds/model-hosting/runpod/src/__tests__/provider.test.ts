import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ModelEndpointSpec } from '@molecule/api-model-hosting'

import { toGraphQLLiteral } from '../client.js'
import { createProvider, gpuIdsFor, toTemplate } from '../provider.js'

const SPEC: ModelEndpointSpec = {
  name: 'jeff',
  image: 'ghcr.io/acme/jeff-serve:0.8b',
  port: 8000,
  healthPath: '/ping',
  env: { JEFF_CHECKPOINT: 'checkpoints/jeff-0.8b' },
  accelerator: { kind: 'gpu', minVramGb: 16 },
  region: 'us',
  scaling: { minInstances: 0, maxInstances: 2, idleTimeoutSeconds: 60 },
  access: 'private',
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const mockFetch = vi.fn()

describe('model-hosting-runpod', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('writes GraphQL input literals with unquoted keys', () => {
    expect(toGraphQLLiteral({ name: 'a "b"', workersMin: 0, flag: true, skip: undefined })).toBe(
      '{ name: "a \\"b\\"", workersMin: 0, flag: true }',
    )
  })

  it('picks the smallest pool class that fits', () => {
    expect(gpuIdsFor(SPEC)).toBe('AMPERE_16')
    expect(gpuIdsFor({ ...SPEC, accelerator: { kind: 'gpu', minVramGb: 20 } })).toBe(
      'AMPERE_24,ADA_24',
    )
    expect(
      gpuIdsFor({ ...SPEC, accelerator: { kind: 'gpu', minVramGb: 16, model: 'ADA_24' } }),
    ).toBe('ADA_24')
  })

  it('builds a serverless template with the port and health env the LB reads', () => {
    expect(toTemplate(SPEC, 20)).toEqual({
      name: 'jeff-template',
      imageName: SPEC.image,
      isServerless: true,
      containerDiskInGb: 20,
      env: {
        JEFF_CHECKPOINT: 'checkpoints/jeff-0.8b',
        PORT: '8000',
        PORT_HEALTH: '8000',
        HEALTH_CHECK_PATH: '/ping',
      },
      ports: ['8000/http'],
    })
  })

  it('refuses a CPU spec before calling anything', async () => {
    await expect(
      createProvider({ apiKey: 'k' }).deploy({ ...SPEC, accelerator: { kind: 'cpu' } }),
    ).rejects.toThrow(/no CPU-only/)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('deploys: template via REST, LB endpoint via GraphQL, then waits on the health path', async () => {
    mockFetch
      .mockResolvedValueOnce(json(200, []))
      .mockResolvedValueOnce(json(200, { id: 'tpl1', name: 'jeff-template' }))
      .mockResolvedValueOnce(json(200, []))
      .mockResolvedValueOnce(json(200, { data: { saveEndpoint: { id: 'ep1', name: 'jeff' } } }))
      .mockResolvedValueOnce(new Response('no workers available', { status: 503 }))
      .mockResolvedValueOnce(new Response('pong', { status: 200 }))
    const ep = await createProvider({ apiKey: 'k', pollIntervalMs: 1 }).deploy(SPEC)
    expect(ep).toMatchObject({ id: 'ep1', url: 'https://ep1.api.runpod.ai', status: 'ready' })

    const calls = mockFetch.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${url}`)
    expect(calls).toEqual([
      'GET https://rest.runpod.io/v1/templates',
      'POST https://rest.runpod.io/v1/templates',
      'GET https://rest.runpod.io/v1/endpoints',
      'POST https://api.runpod.io/graphql',
      'GET https://ep1.api.runpod.ai/ping',
      'GET https://ep1.api.runpod.ai/ping',
    ])
    const query = JSON.parse(mockFetch.mock.calls[3]![1].body).query as string
    expect(query).toContain('saveEndpoint(input: {')
    expect(query).toContain('type: "LB"')
    expect(query).toContain('templateId: "tpl1"')
    expect(query).toContain('gpuIds: "AMPERE_16"')
    expect(query).toContain('locations: "US"')
    expect(mockFetch.mock.calls[4]![1].headers.authorization).toBe('Bearer k')
  })

  it('updates an existing endpoint with REST PATCH', async () => {
    mockFetch
      .mockResolvedValueOnce(json(200, [{ id: 'tpl1', name: 'jeff-template' }]))
      .mockResolvedValueOnce(json(200, { id: 'tpl1' }))
      .mockResolvedValueOnce(json(200, [{ id: 'ep1', name: 'jeff' }]))
      .mockResolvedValueOnce(json(200, { id: 'ep1', name: 'jeff' }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
    await createProvider({ apiKey: 'k', pollIntervalMs: 1 }).deploy(SPEC)
    const [url, init] = mockFetch.mock.calls[3]!
    expect(`${init.method} ${url}`).toBe('PATCH https://rest.runpod.io/v1/endpoints/ep1')
    expect(JSON.parse(init.body)).toMatchObject({
      templateId: 'tpl1',
      workersMin: 0,
      workersMax: 2,
      idleTimeout: 60,
    })
  })

  it('remove drains, deletes the endpoint, then the template', async () => {
    mockFetch
      .mockResolvedValueOnce(json(200, { id: 'ep1', name: 'jeff', templateId: 'tpl1' }))
      .mockResolvedValueOnce(json(200, { id: 'ep1', name: 'jeff' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    await createProvider({ apiKey: 'k' }).remove('ep1')
    const calls = mockFetch.mock.calls.map(([url, init]) => `${init.method} ${url}`)
    expect(calls).toEqual([
      'GET https://rest.runpod.io/v1/endpoints/ep1?includeWorkers=true',
      'PATCH https://rest.runpod.io/v1/endpoints/ep1',
      'DELETE https://rest.runpod.io/v1/endpoints/ep1',
      'DELETE https://rest.runpod.io/v1/templates/tpl1',
    ])
  })

  it('authHeaders is the API key; a missing key is named', async () => {
    expect(await createProvider({ apiKey: 'k' }).authHeaders('ep1')).toEqual({
      authorization: 'Bearer k',
    })
    vi.stubEnv('RUNPOD_API_KEY', '')
    await expect(createProvider().authHeaders('ep1')).rejects.toThrow(/RUNPOD_API_KEY/)
    vi.unstubAllEnvs()
  })
})
