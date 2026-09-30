import { createVerify, generateKeyPairSync } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ModelEndpointSpec } from '@molecule/api-model-hosting'

import { signServiceAccountJwt } from '../client.js'
import { createProvider, fromRunService, toRunService } from '../provider.js'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const KEY = JSON.stringify({
  client_email: 'deployer@acme.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  private_key_id: 'kid-1',
})

const SPEC: ModelEndpointSpec = {
  name: 'laya',
  image: 'us-docker.pkg.dev/acme/models/laya-serve:0.3.1',
  port: 8000,
  healthPath: '/health',
  env: { LAYA_PRELOAD: '1' },
  accelerator: { kind: 'cpu' },
  region: 'us',
  scaling: { minInstances: 0, maxInstances: 3, idleTimeoutSeconds: 900 },
  access: 'private',
}

const NAME = 'projects/acme/locations/us-central1/services/laya'
const READY = {
  name: NAME,
  uri: 'https://laya-abc-uc.a.run.app',
  reconciling: false,
  terminalCondition: { type: 'Ready', state: 'CONDITION_SUCCEEDED' },
  template: { scaling: { minInstanceCount: 0, maxInstanceCount: 3 } },
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const mockFetch = vi.fn()

describe('model-hosting-cloud-run', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('signs an RS256 service-account JWT Google can verify', () => {
    const jwt = signServiceAccountJwt(
      JSON.parse(KEY),
      { scope: 'https://www.googleapis.com/auth/cloud-platform' },
      'https://oauth2.googleapis.com/token',
      1_000,
    )
    const [h, p, s] = jwt.split('.')
    expect(JSON.parse(Buffer.from(h!, 'base64url').toString())).toEqual({
      alg: 'RS256',
      typ: 'JWT',
      kid: 'kid-1',
    })
    expect(JSON.parse(Buffer.from(p!, 'base64url').toString())).toEqual({
      iss: 'deployer@acme.iam.gserviceaccount.com',
      aud: 'https://oauth2.googleapis.com/token',
      iat: 1_000,
      exp: 4_600,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
    })
    const ok = createVerify('RSA-SHA256')
      .update(`${h}.${p}`)
      .verify(publicKey, Buffer.from(s!, 'base64url'))
    expect(ok).toBe(true)
  })

  it('builds a CPU service: request-billed, startup probe on the health path, IAM on', () => {
    const body = toRunService(SPEC)
    expect(body.invokerIamDisabled).toBe(false)
    expect(body.template?.scaling).toEqual({ minInstanceCount: 0, maxInstanceCount: 3 })
    expect(body.template?.nodeSelector).toBeUndefined()
    expect(body.template?.containers?.[0]).toMatchObject({
      image: SPEC.image,
      ports: [{ containerPort: 8000 }],
      env: [{ name: 'LAYA_PRELOAD', value: '1' }],
      resources: { limits: { cpu: '2', memory: '4096Mi' }, cpuIdle: true },
      startupProbe: { httpGet: { path: '/health', port: 8000 } },
    })
  })

  it('builds an L4 service with the GPU minimums and instance billing', () => {
    const body = toRunService({ ...SPEC, accelerator: { kind: 'gpu', minVramGb: 16 }, cpu: 2 })
    expect(body.template?.nodeSelector).toEqual({ accelerator: 'nvidia-l4' })
    expect(body.template?.gpuZonalRedundancyDisabled).toBe(true)
    expect(body.template?.containers?.[0]?.resources).toEqual({
      limits: { cpu: '4', memory: '16384Mi', 'nvidia.com/gpu': '1' },
      cpuIdle: false,
      startupCpuBoost: true,
    })
  })

  it('maps service conditions to endpoint status', () => {
    expect(fromRunService(READY).status).toBe('ready')
    expect(fromRunService({ ...READY, reconciling: true }).status).toBe('deploying')
    const failed = fromRunService({
      ...READY,
      terminalCondition: { type: 'Ready', state: 'CONDITION_FAILED', message: 'image not found' },
    })
    expect(failed).toMatchObject({ status: 'failed', error: 'image not found' })
  })

  it('deploys: token, GET 404, POST ?serviceId, then polls until Ready', async () => {
    mockFetch
      .mockResolvedValueOnce(json(200, { access_token: 'at', expires_in: 3600 }))
      .mockResolvedValueOnce(json(404, { error: { status: 'NOT_FOUND' } }))
      .mockResolvedValueOnce(json(200, { name: 'operations/1' }))
      .mockResolvedValueOnce(json(200, { ...READY, reconciling: true }))
      .mockResolvedValueOnce(json(200, READY))
    const hosting = createProvider({
      projectId: 'acme',
      serviceAccountJson: KEY,
      pollIntervalMs: 1,
    })
    const ep = await hosting.deploy(SPEC)
    expect(ep).toMatchObject({ id: NAME, url: READY.uri, status: 'ready', region: 'us-central1' })

    const [tokenUrl, tokenInit] = mockFetch.mock.calls[0]!
    expect(tokenUrl).toBe('https://oauth2.googleapis.com/token')
    expect(tokenInit.headers['content-type']).toBe('application/x-www-form-urlencoded')
    expect(new URLSearchParams(tokenInit.body).get('grant_type')).toBe(
      'urn:ietf:params:oauth:grant-type:jwt-bearer',
    )
    expect(mockFetch.mock.calls[1]![0]).toBe(`https://run.googleapis.com/v2/${NAME}`)
    const [createUrl, createInit] = mockFetch.mock.calls[2]!
    expect(createUrl).toBe(
      'https://run.googleapis.com/v2/projects/acme/locations/us-central1/services?serviceId=laya',
    )
    expect(createInit.method).toBe('POST')
    expect(createInit.headers.authorization).toBe('Bearer at')
    expect(JSON.parse(createInit.body).labels).toEqual({ 'managed-by': 'molecule-model-hosting' })
  })

  it('refuses a GPU in a region without L4s before calling anything', async () => {
    const hosting = createProvider({ projectId: 'acme', serviceAccountJson: KEY })
    await expect(
      hosting.deploy({ ...SPEC, region: 'us-west1', accelerator: { kind: 'gpu', minVramGb: 16 } }),
    ).rejects.toThrow(/no L4 GPUs/)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('authHeaders mints an ID token for the service URL and caches it', async () => {
    mockFetch
      .mockResolvedValueOnce(json(200, { access_token: 'at', expires_in: 3600 }))
      .mockResolvedValueOnce(json(200, READY))
      .mockResolvedValueOnce(json(200, { id_token: 'idt', expires_in: 3600 }))
      .mockResolvedValueOnce(json(200, READY))
    const hosting = createProvider({ projectId: 'acme', serviceAccountJson: KEY })
    expect(await hosting.authHeaders(NAME)).toEqual({ authorization: 'Bearer idt' })
    expect(await hosting.authHeaders(NAME)).toEqual({ authorization: 'Bearer idt' })
    const assertion = new URLSearchParams(mockFetch.mock.calls[2]![1].body).get('assertion')!
    const claims = JSON.parse(Buffer.from(assertion.split('.')[1]!, 'base64url').toString())
    expect(claims.target_audience).toBe(READY.uri)
    expect(mockFetch).toHaveBeenCalledTimes(4) // no second token exchange
  })

  it('throws a config error naming the missing secret', async () => {
    vi.stubEnv('GOOGLE_CLOUD_PROJECT', '')
    const hosting = createProvider({ serviceAccountJson: KEY })
    await expect(hosting.deploy(SPEC)).rejects.toThrow(/GOOGLE_CLOUD_PROJECT/)
    vi.unstubAllEnvs()
  })
})
