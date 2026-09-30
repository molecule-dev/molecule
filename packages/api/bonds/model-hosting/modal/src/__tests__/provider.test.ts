import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ModelEndpointSpec } from '@molecule/api-model-hosting'

import { appSource, gpuFor, toPython } from '../app-source.js'
import { endpointUrl, resolveModalConfig } from '../client.js'
import { createProvider, fromAppRow, MODAL_CAPABILITIES, regionMultiplier } from '../provider.js'
import type { ModalRunner, RunResult } from '../types.js'

const SPEC: ModelEndpointSpec = {
  name: 'kev',
  image: 'ghcr.io/acme/kev-serve:0.8.2',
  command: ['kev-serve', '--port', '8000'],
  port: 8000,
  healthPath: '/health',
  env: { KEV_PRELOAD: '1' },
  secretEnv: { LAYA_API_KEY: 'sk-test' },
  accelerator: { kind: 'gpu', minVramGb: 16 },
  region: 'us',
  scaling: { minInstances: 0, maxInstances: 2, idleTimeoutSeconds: 300 },
  access: 'private',
  serverEnforcesAuth: true,
}

const ok = (stdout = ''): RunResult => ({ code: 0, stdout, stderr: '' })
const fail = (stderr: string, code = 1): RunResult => ({ code, stdout: '', stderr })

describe('model-hosting-modal', () => {
  let runner: ModalRunner
  let runs: {
    bin: string
    args: string[]
    opts: { env: Record<string, string>; cwd?: string; input?: string }
  }[]
  const mockFetch = vi.fn()

  beforeEach(() => {
    runs = []
    runner = async (bin, args, opts) => {
      runs.push({ bin, args, opts })
      if (args[0] === 'deploy') return ok('Deployed app "kev"')
      if (args[0] === 'app' && args[1] === 'list')
        return ok(
          JSON.stringify([
            {
              app_id: 'ap-1',
              description: 'kev',
              state: 'deployed',
              created_at: '2026-09-30T00:00:00Z',
            },
            { app_id: 'ap-2', description: 'old', state: 'stopped' },
          ]),
        )
      return ok()
    }
    mockFetch.mockReset()
    mockFetch.mockResolvedValue(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)
    vi.unstubAllEnvs()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const provider = (config = {}) =>
    createProvider({
      tokenId: 'ak-id',
      tokenSecret: 'as-secret',
      workspace: 'acme',
      proxyTokenId: 'epk-id',
      proxyTokenSecret: 'eps-secret',
      pollIntervalMs: 1,
      runner,
      ...config,
    })

  it('renders Python literals and picks the smallest GPU that fits', () => {
    expect(toPython('laya')).toBe('"laya"')
    expect(toPython(true)).toBe('True')
    expect(toPython({ a: [1, 2] })).toBe('{"a": [1, 2]}')
    expect(gpuFor({ ...SPEC, accelerator: { kind: 'gpu', minVramGb: 20 } })).toBe('L4')
    expect(gpuFor({ ...SPEC, accelerator: { kind: 'gpu', minVramGb: 16, model: 'A10' } })).toBe(
      'A10',
    )
    expect(gpuFor({ ...SPEC, accelerator: { kind: 'cpu' } })).toBe(null)
    expect(() => gpuFor({ ...SPEC, accelerator: { kind: 'gpu', minVramGb: 500 } })).toThrow(
      /no GPU/,
    )
  })

  it('generates the app.py: registry image, proxy auth, secrets, label', () => {
    const src = appSource(SPEC, { startupTimeoutSeconds: 600 })
    expect(src).toContain('image = modal.Image.from_registry("ghcr.io/acme/kev-serve:0.8.2")')
    expect(src).toContain('app = modal.App("kev")')
    expect(src).toContain('gpu="T4"')
    expect(src).toContain('min_containers=0, max_containers=2, scaledown_window=300')
    expect(src).toContain('region="us"')
    expect(src).toContain('secrets=[modal.Secret.from_dict({"LAYA_API_KEY": "sk-test"})]')
    expect(src).toContain(
      '@modal.web_server(8000, startup_timeout=600, label="kev", requires_proxy_auth=True)',
    )
    expect(src).toContain('subprocess.Popen(["kev-serve", "--port", "8000"])')
    expect(() =>
      appSource({ ...SPEC, command: undefined }, { startupTimeoutSeconds: 600 }),
    ).toThrow(/command/)
  })

  it('builds the endpoint URL from workspace + environment suffix', () => {
    expect(endpointUrl({ workspace: 'acme' }, 'kev')).toBe('https://acme--kev.modal.run')
    expect(endpointUrl({ workspace: 'acme', environmentSuffix: 'prod' }, 'kev')).toBe(
      'https://acme-prod--kev.modal.run',
    )
  })

  it('deploys: writes app.py, runs the CLI with the token env, polls health with proxy auth', async () => {
    mockFetch.mockResolvedValue(new Response('ok', { status: 200 }))
    const ep = await provider().deploy(SPEC)
    expect(ep).toMatchObject({
      id: 'kev',
      provider: 'modal',
      url: 'https://acme--kev.modal.run',
      status: 'ready',
      region: 'us',
    })
    const deploy = runs.find((r) => r.args[0] === 'deploy')!
    expect(deploy.bin).toBe('modal')
    expect(deploy.args).toEqual(['deploy', 'app.py'])
    expect(deploy.opts.env.MODAL_TOKEN_ID).toBe('ak-id')
    expect(deploy.opts.env.MODAL_TOKEN_SECRET).toBe('as-secret')
    expect(deploy.opts.cwd).toMatch(/mol-model-hosting-modal-/)
    const health = mockFetch.mock.calls[0]!
    expect(health[0]).toBe('https://acme--kev.modal.run/health')
    expect(health[1].headers['Modal-Key']).toBe('epk-id')
    expect(health[1].headers['Modal-Secret']).toBe('eps-secret')
  })

  it('surfaces a CLI deploy failure with stderr', async () => {
    runner = async () => fail('image not found')
    await expect(provider().deploy(SPEC)).rejects.toThrow(/image not found/)
  })

  it('fails a private deploy fast when proxy tokens are missing', async () => {
    await expect(
      provider({ proxyTokenId: undefined, proxyTokenSecret: undefined }).deploy(SPEC),
    ).rejects.toThrow(/MODAL_PROXY_TOKEN_ID/)
    expect(runs.find((r) => r.args[0] === 'deploy')).toBeUndefined()
  })

  it('lists only deployed apps and enriches ones this process deployed', async () => {
    const hosting = provider()
    await hosting.deploy(SPEC)
    const list = await hosting.list()
    expect(list).toHaveLength(1) // "old" is stopped — filtered
    expect(list[0]).toMatchObject({ id: 'kev', status: 'ready', region: 'us' })
    expect(await hosting.get('kev')).toMatchObject({
      id: 'kev',
      url: 'https://acme--kev.modal.run',
    })
    expect(await hosting.get('missing')).toBe(null)
  })

  it('scales through Function.update_autoscaler and refuses concurrency', async () => {
    const hosting = provider()
    await hosting.deploy(SPEC)
    const ep = await hosting.scale('kev', {
      minInstances: 1,
      maxInstances: 4,
      idleTimeoutSeconds: 600,
    })
    expect(ep.scaling).toEqual({ minInstances: 1, maxInstances: 4, idleTimeoutSeconds: 600 })
    const scale = runs.find((r) => r.bin === 'python3')!
    expect(scale.args[0]).toBe('-c')
    expect(scale.args[1]).toContain('modal.Function.from_name("kev", "serve")')
    expect(scale.args[1]).toContain('min_containers=1, max_containers=4, scaledown_window=600')
    await expect(hosting.scale('kev', { ...ep.scaling, concurrency: 4 })).rejects.toThrow(
      /concurrency/,
    )
  })

  it('stops the app on remove; a stopped app reads as gone', async () => {
    runner = async (bin, args) => {
      runs.push({ bin, args, opts: { env: {} } })
      if (args[0] === 'app' && args[1] === 'list')
        return ok(JSON.stringify([{ app_id: 'ap-1', description: 'kev', state: 'stopped' }]))
      return ok()
    }
    const hosting = provider()
    await hosting.remove('kev')
    const stop = runs.find((r) => r.args[0] === 'app' && r.args[1] === 'stop')!
    expect(stop.args).toEqual(['app', 'stop', 'kev'])
    expect(await hosting.get('kev')).toBe(null) // stopped → filtered
  })

  it('authHeaders sends proxy auth, or {} for public endpoints', async () => {
    const hosting = provider()
    expect(await hosting.authHeaders('kev')).toEqual({
      'Modal-Key': 'epk-id',
      'Modal-Secret': 'eps-secret',
    })
    expect(
      await provider({ proxyTokenId: undefined, proxyTokenSecret: undefined }).authHeaders('kev'),
    ).toEqual({})
  })

  it('throws a config error naming the missing secret', async () => {
    await expect(
      provider({ tokenId: undefined, tokenSecret: undefined }).deploy(SPEC),
    ).rejects.toThrow(/MODAL_TOKEN_ID/)
    await expect(provider({ workspace: undefined }).deploy(SPEC)).rejects.toThrow(/MODAL_WORKSPACE/)
  })

  it('estimates from the dated list prices, GPU and CPU, min≥1 and scale-to-zero', async () => {
    const hosting = provider()
    const gpu = await hosting.estimate(SPEC, { requestsPerDay: 5000, busyMsPerRequest: 200 })
    // T4 0.000164 + 4 GiB memory, ×1.15 us — always-on (min 0 → busy-time billing here)
    expect(gpu.currency).toBe('USD')
    expect(gpu.basis.map((b) => b.item)).toEqual([
      'GPU T4',
      '4 GiB memory',
      'region multiplier (us)',
    ])
    const busyGpu = (200 / 1000) * 5000 * 30 * (0.000164 + (4 / 1024) * (0.00000222 / 3600)) * 1.15
    expect(gpu.monthly).toBeCloseTo(busyGpu, 1)
    const warm = await hosting.estimate(
      {
        ...SPEC,
        accelerator: { kind: 'gpu', minVramGb: 16 },
        scaling: { ...SPEC.scaling, minInstances: 1 },
      },
      { requestsPerDay: 5000, busyMsPerRequest: 200 },
    )
    expect(warm.monthly).toBeCloseTo(
      0.000164 * 86400 * 30 * 1.15 + (4 / 1024) * (0.00000222 / 3600) * 86400 * 30 * 1.15,
      1,
    )
    const cpu = await hosting.estimate(
      { ...SPEC, accelerator: { kind: 'cpu' }, cpu: 2, memoryMb: 4096 },
      { requestsPerDay: 5000, busyMsPerRequest: 1000 },
    )
    expect(cpu.basis.map((b) => b.item)).toEqual([
      '2 CPU core(s)',
      '4 GiB memory',
      'region multiplier (us)',
    ])
    await expect(
      hosting.estimate(
        { ...SPEC, accelerator: { kind: 'gpu', minVramGb: 80, model: 'H100' } },
        { requestsPerDay: 1, busyMsPerRequest: 1 },
      ),
    ).rejects.toThrow(/no verified list price/)
  })

  it('maps capabilities and region multipliers', () => {
    expect(MODAL_CAPABILITIES.accelerators).toContain('T4')
    expect(MODAL_CAPABILITIES.idleTimeoutRange).toEqual([2, 1200])
    expect(MODAL_CAPABILITIES.platformAuth).toBe(true)
    expect(regionMultiplier('us')).toBe(1.15)
    expect(regionMultiplier('us-east')).toBe(1.75)
    expect(resolveModalConfig({})).toMatchObject({ modalBin: 'modal', pythonBin: 'python3' })
  })

  it('maps app rows to endpoints', () => {
    expect(
      fromAppRow({ description: 'kev', state: 'deployed' }, { workspace: 'acme' }),
    ).toMatchObject({
      id: 'kev',
      status: 'ready',
      url: 'https://acme--kev.modal.run',
    })
    expect(fromAppRow({ description: 'old', state: 'stopped' }, { workspace: 'acme' })).toBe(null)
    expect(fromAppRow({ state: 'deployed' }, { workspace: 'acme' })).toBe(null)
  })
})
