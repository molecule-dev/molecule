import { beforeEach, describe, expect, it } from 'vitest'

import { reset } from '@molecule/api-bond'

import {
  assertDeployable,
  getProvider,
  getProviderByName,
  hasProvider,
  requireProvider,
  setProvider,
} from '../provider.js'
import type { ModelEndpointSpec, ModelHostingProvider, ProviderCapabilities } from '../types.js'

const CAPS: ProviderCapabilities = {
  accelerators: ['cpu', 'nvidia-l4'],
  regions: ['us-central1'],
  scaleToZero: true,
  idleTimeoutRange: [0, 3600],
  platformAuth: true,
}

const fake = (name: string): ModelHostingProvider => ({
  name,
  capabilities: CAPS,
  deploy: async () => {
    throw new Error('unused')
  },
  get: async () => null,
  list: async () => [],
  scale: async () => {
    throw new Error('unused')
  },
  remove: async () => {},
  authHeaders: async () => ({}),
})

const SPEC: ModelEndpointSpec = {
  name: 'laya',
  image: 'ghcr.io/acme/laya-serve:0.3.1',
  port: 8000,
  healthPath: '/health',
  accelerator: { kind: 'cpu' },
  region: 'us',
  scaling: { minInstances: 0, maxInstances: 2, idleTimeoutSeconds: 300 },
  access: 'private',
}

describe('model-hosting accessor', () => {
  beforeEach(() => reset())

  it('requireProvider throws until a provider is bonded', () => {
    expect(() => requireProvider()).toThrow(/not configured/)
    expect(getProvider()).toBeNull()
  })

  it('singleton and named providers', () => {
    setProvider('modal', fake('modal'))
    expect(hasProvider('modal')).toBe(true)
    expect(getProviderByName('modal')?.name).toBe('modal')
    expect(requireProvider().name).toBe('modal') // first named also becomes the singleton
    setProvider(fake('docker'))
    expect(requireProvider().name).toBe('docker')
  })
})

describe('assertDeployable', () => {
  it('accepts a valid spec', () => {
    expect(() => assertDeployable(SPEC, CAPS, 'x')).not.toThrow()
  })

  it.each<[string, Partial<ModelEndpointSpec>, RegExp]>([
    ['bad name', { name: 'Laya_Serve' }, /name/],
    ['no image', { image: ' ' }, /image/],
    ['bad port', { port: 70000 }, /port/],
    ['health path', { healthPath: 'health' }, /healthPath/],
    [
      'max < min',
      { scaling: { minInstances: 3, maxInstances: 2, idleTimeoutSeconds: 60 } },
      /maxInstances/,
    ],
    [
      'idle out of range',
      { scaling: { minInstances: 0, maxInstances: 1, idleTimeoutSeconds: 99999 } },
      /idleTimeoutSeconds/,
    ],
    ['zero vram', { accelerator: { kind: 'gpu', minVramGb: 0 } }, /minVramGb/],
  ])('refuses %s', (_label, over, re) => {
    expect(() => assertDeployable({ ...SPEC, ...over }, CAPS, 'x')).toThrow(re)
  })

  it('refuses scale-to-zero, CPU or GPU a provider does not offer', () => {
    const noZero = { ...CAPS, scaleToZero: false }
    expect(() => assertDeployable(SPEC, noZero, 'x')).toThrow(/scale to zero/)
    const gpuOnly = { ...CAPS, accelerators: ['AMPERE_16'] }
    expect(() => assertDeployable(SPEC, gpuOnly, 'x')).toThrow(/no CPU-only/)
    const cpuOnly = { ...CAPS, accelerators: ['cpu'] }
    expect(() =>
      assertDeployable({ ...SPEC, accelerator: { kind: 'gpu', minVramGb: 16 } }, cpuOnly, 'x'),
    ).toThrow(/no GPUs/)
  })

  it('refuses private access without platform auth unless the server enforces its own key', () => {
    const noAuth = { ...CAPS, platformAuth: false }
    expect(() => assertDeployable(SPEC, noAuth, 'koyeb')).toThrow(/serverEnforcesAuth/)
    expect(() =>
      assertDeployable({ ...SPEC, serverEnforcesAuth: true }, noAuth, 'koyeb'),
    ).not.toThrow()
    expect(() => assertDeployable({ ...SPEC, access: 'public' }, noAuth, 'koyeb')).not.toThrow()
  })
})
