import { beforeEach, describe, expect, it } from 'vitest'

import { unbondAll } from '@molecule/api-bond'

import {
  DEPLOY_TARGET_BOND_TYPE,
  getProvider,
  hasProvider,
  listProviders,
  requireProvider,
  setProvider,
} from '../provider.js'
import type { DeployTargetProvider } from '../types.js'

const target = (name: string, hosts: DeployTargetProvider['hosts']): DeployTargetProvider => ({
  name,
  hosts,
  deploy: async (request) => ({
    target: name,
    siteId: request.siteId,
    releaseId: request.releaseId,
    origin: { kind: 'http-upstream', url: 'http://127.0.0.1:4000' },
    url: null,
    routing: request.routing,
    fileCount: request.files?.length ?? 0,
    bytes: 0,
  }),
  remove: async () => {},
})

describe('deploy-target accessors', () => {
  beforeEach(() => {
    unbondAll(DEPLOY_TARGET_BOND_TYPE)
  })

  it('bonds targets by name under the deploy-target category', () => {
    const staticTarget = target('s3', 'static-files')
    const machine = target('machine', 'app-server')
    setProvider('static', staticTarget)
    setProvider('machine', machine)

    expect(DEPLOY_TARGET_BOND_TYPE).toBe('deploy-target')
    expect(getProvider('static')).toBe(staticTarget)
    expect(requireProvider('machine')).toBe(machine)
    expect(hasProvider('static')).toBe(true)
    expect([...listProviders().keys()].sort()).toEqual(['machine', 'static'])
  })

  it('answers null / false for a slot nothing is bonded in', () => {
    expect(getProvider('static')).toBeNull()
    expect(hasProvider('static')).toBe(false)
    expect(listProviders().size).toBe(0)
  })

  it('requireProvider throws naming the slot, and never falls back to another one', () => {
    setProvider('machine', target('machine', 'app-server'))
    expect(() => requireProvider('static')).toThrow(/'static'/)
  })

  it('a bonded target publishes through the shared contract', async () => {
    setProvider('static', target('s3', 'static-files'))
    const release = await requireProvider('static').deploy({
      siteId: 'site1',
      releaseId: 'r1',
      files: [{ path: '/index.html', body: new TextEncoder().encode('<h1>hi</h1>') }],
      routing: { basePath: '/blog', unmatchedPaths: 'not-found' },
    })
    expect(release).toMatchObject({ target: 's3', siteId: 'site1', releaseId: 'r1', fileCount: 1 })
    expect(release.routing.basePath).toBe('/blog')
  })
})
