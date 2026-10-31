import { createHash } from 'node:crypto'

import { describe, expect, it, vi } from 'vitest'

import { encodePrivateRoutes } from '../flycast.js'
import type { FlyioConfig } from '../types.js'
import { createFetchDouble, mockLogger } from './helpers.js'

vi.mock('@molecule/api-bond', () => ({ getLogger: () => mockLogger }))
vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}))

const { FlyApiClient } = await import('../api.js')
const { appNameForProject } = await import('../ids.js')
const { createProvider } = await import('../provider.js')

const PROJECT_ID = 'a3f1c0de-0000-4000-8000-000000000001'
const OTHER_PROJECT_ID = 'a3f1c0de-0000-4000-8000-000000000002'
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

function durableVolumeName(name: string): string {
  const sanitized = name.toLowerCase().replace(/[^a-z0-9_]/g, '_')
  if (sanitized.length <= 30) return sanitized
  const digest = createHash('sha256').update(name).digest('hex').slice(0, 12)
  return `${sanitized.slice(0, 17)}_${digest}`
}

describe('round-five create safety regressions', () => {
  it('shared-app creation never deletes another project’s running Machine', async () => {
    const double = createFetchDouble()
      .on('GET /apps/shared', { body: { name: 'shared' } })
      .on('GET /apps/shared', { body: { name: 'shared' } })
      .on('GET /apps/shared/machines', { body: [] })
      .on('POST /apps/shared/machines', { body: { id: 'a-machine', state: 'started' } })
      .on('GET /apps/shared/machines', {
        body: [
          {
            id: 'a-machine',
            state: 'started',
            created_at: new Date(Date.now() - 10 * 60_000).toISOString(),
            config: {
              metadata: {
                'molecule-sandbox.managed': 'true',
                'molecule-sandbox.projectId': PROJECT_ID,
              },
            },
          },
        ],
      })
      .on('POST /apps/shared/machines', { body: { id: 'b-machine', state: 'started' } })
    const provider = makeProvider(double, { appPerProject: false, appName: 'shared' })

    await provider.create({ projectId: PROJECT_ID })
    await provider.create({ projectId: OTHER_PROJECT_ID })

    expect(double.matching('DELETE /apps/shared/machines/a-machine')).toHaveLength(0)
  })

  it('finds a serving Machine whose 50-character prefix was shortened for naming', async () => {
    const prefix = 'p'.repeat(50)
    const app = appNameForProject(prefix, PROJECT_ID)
    const double = createFetchDouble()
      .on('GET /apps?org_slug=acme', { body: { apps: [{ name: app }], total_apps: 1 } })
      .on(`GET /apps/${app}/machines`, {
        body: [
          {
            id: 'serving',
            state: 'started',
            config: {
              metadata: {
                'molecule-sandbox.managed': 'true',
                'molecule-sandbox.projectId': PROJECT_ID,
              },
            },
          },
        ],
      })

    await expect(
      makeProvider(double, { appPrefix: prefix }).find({ projectId: PROJECT_ID }),
    ).resolves.toMatchObject([{ id: `${app}:serving`, status: 'running' }])
  })

  it('recreates a sandbox on its existing durable workspace volume without deleting it', async () => {
    const label = `mol-${PROJECT_ID}`
    const durableName = durableVolumeName(label)
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { body: { name: APP, network: APP } })
      .on(`GET /apps/${APP}/volumes`, {
        body: [
          {
            id: 'workspace-v1',
            name: durableName,
            created_at: new Date(Date.now() - 10 * 60_000).toISOString(),
          },
        ],
      })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm2', state: 'started' } })

    await makeProvider(double).create({ projectId: PROJECT_ID, volumeName: label })

    expect(double.matching(`DELETE /apps/${APP}/volumes/workspace-v1`)).toHaveLength(0)
    expect(double.matching(`POST /apps/${APP}/volumes`)).toHaveLength(0)
    const machinePost = double.matching(`POST /apps/${APP}/machines`)[0]
    expect(machinePost?.body).toMatchObject({
      config: { mounts: [{ volume: 'workspace-v1' }] },
    })
  })

  it('releases recorded external Flycast addresses before forgetting an owned app', async () => {
    const target = 'tenant-database'
    const routes = { [target]: 'fdaa:0:1::2' }
    const double = createFetchDouble()
      .on(`GET /apps/${APP}/machines`, {
        body: [
          {
            id: 'm1',
            config: {
              metadata: {
                'molecule-sandbox.privateRoutes': encodePrivateRoutes(routes),
              },
            },
          },
        ],
      })
      .on(`DELETE /apps/${target}/ip_assignments/${encodeURIComponent(routes[target])}`, {
        status: 204,
      })
      .on(`DELETE /apps/${APP}`, { status: 204 })
    const provider = makeProvider(double) as ReturnType<typeof createProvider> & {
      destroyApp(projectId: string): Promise<void>
    }

    await provider.destroyApp(PROJECT_ID)

    expect(double.matching(`DELETE /apps/${target}/ip_assignments/`)).toHaveLength(1)
    expect(double.matching(`DELETE /apps/${APP}`)).toHaveLength(1)
  })
})
