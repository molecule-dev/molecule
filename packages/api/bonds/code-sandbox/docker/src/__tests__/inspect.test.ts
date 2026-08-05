/**
 * Tests for descriptors, queries, volume listing and live resource updates.
 *
 * The distinctions under test are the ones whose wrong answer is a deletion: a
 * failed enumeration reported as "nothing found", an unreadable attachment
 * reported as "unattached", and a never-started container reported as merely
 * stopped.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import {
  describeContainer,
  findContainers,
  type InspectContext,
  listDockerVolumes,
  toDescriptor,
  updateContainerResources,
} from '../inspect.js'

/** Build an inspection context from a request function. */
function context(request: InspectContext['request']): InspectContext {
  return { request, labelPrefix: 'molecule-sandbox', warn: vi.fn(), debug: vi.fn() }
}

/** A container inspect payload with sensible defaults. */
function inspectPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    Id: 'container-1',
    Created: '2026-08-01T00:00:00Z',
    State: { Running: true, StartedAt: '2026-08-01T00:00:05Z' },
    Config: {
      Image: 'molecule-sandbox:latest',
      Labels: {
        'molecule-sandbox.projectId': 'project-1',
        'molecule-sandbox.volumeName': 'mol-project-1',
      },
    },
    Mounts: [{ Type: 'volume', Name: 'mol-project-1' }],
    NetworkSettings: {
      Ports: {
        '5173/tcp': [{ HostIp: '127.0.0.1', HostPort: '49213' }],
        '4000/tcp': null,
      },
    },
    ...overrides,
  }
}

describe('toDescriptor', () => {
  it('reads back the ports the caller can actually reach', () => {
    const descriptor = toDescriptor(context(vi.fn()), inspectPayload())
    expect(descriptor.ports).toEqual([{ sandboxPort: 5173, host: '127.0.0.1', port: 49213 }])
    expect(descriptor.projectId).toBe('project-1')
    expect(descriptor.volumeName).toBe('mol-project-1')
  })

  it('reports startedAt null for a container that has NEVER been started', () => {
    // This is the shape of an interrupted creation: it holds its storage forever
    // and will never run. Nothing in `status` distinguishes it from a sandbox
    // that is simply stopped.
    const descriptor = toDescriptor(
      context(vi.fn()),
      inspectPayload({ State: { Running: false, StartedAt: '0001-01-01T00:00:00Z' } }),
    )
    expect(descriptor.startedAt).toBeNull()
    expect(descriptor.status).toBe('stopped')
  })

  it('falls back to the mount when no volume label was stamped', () => {
    const descriptor = toDescriptor(
      context(vi.fn()),
      inspectPayload({
        Config: { Image: 'molecule-sandbox:latest', Labels: {} },
        Mounts: [
          { Type: 'bind', Name: undefined },
          { Type: 'volume', Name: 'mol-pool-abc' },
        ],
      }),
    )
    expect(descriptor.volumeName).toBe('mol-pool-abc')
  })
})

describe('describeContainer', () => {
  it('returns null only for a genuine 404', async () => {
    const ctx = context(async () => {
      throw new Error('Docker API GET /containers/x/json: 404 no such container')
    })
    expect(await describeContainer(ctx, 'x')).toBeNull()
  })

  it('throws on any other failure, so absence is never inferred from an outage', async () => {
    const ctx = context(async () => {
      throw new Error('Docker API GET /containers/x/json: 500 server error')
    })
    await expect(describeContainer(ctx, 'x')).rejects.toThrow(/500/)
  })
})

describe('findContainers', () => {
  it('filters by label and by the coarse status', async () => {
    const ctx = context(async (path) => {
      if (path.startsWith('/containers/json')) return [{ Id: 'a' }, { Id: 'b' }]
      if (path === '/containers/a/json') return inspectPayload({ Id: 'a' })
      return inspectPayload({
        Id: 'b',
        State: { Running: false, StartedAt: '2026-08-01T00:00:05Z' },
      })
    })

    const running = await findContainers(ctx, {
      labels: { 'molecule.pool': 'warm' },
      statuses: ['running'],
    })
    expect(running.map((d) => d.id)).toEqual(['a'])
  })

  it('skips a container that vanished between listing and inspection', async () => {
    // Reconciliation loops race removals constantly; "it is gone" is a real
    // answer, not a failure.
    const ctx = context(async (path) => {
      if (path.startsWith('/containers/json')) return [{ Id: 'a' }, { Id: 'gone' }]
      if (path === '/containers/gone/json') throw new Error('Docker API: 404 no such container')
      return inspectPayload({ Id: 'a' })
    })
    expect((await findContainers(ctx)).map((d) => d.id)).toEqual(['a'])
  })

  it('propagates a failed listing instead of reporting "nothing to recover"', async () => {
    const ctx = context(async () => {
      throw new Error('Docker API GET /containers/json: 500 boom')
    })
    await expect(findContainers(ctx)).rejects.toThrow(/500/)
  })
})

describe('listDockerVolumes', () => {
  /** Two volumes, one of which Docker reports as dangling (unattached). */
  const volumesRequest: InspectContext['request'] = async (path) => {
    if (path.includes('dangling')) return { Volumes: [{ Name: 'mol-pool-orphan' }] }
    return {
      Volumes: [
        { Name: 'mol-pool-orphan', CreatedAt: '2026-08-01T00:00:00Z', UsageData: { Size: 2048 } },
        { Name: 'mol-project-live', CreatedAt: '2026-08-01T00:00:00Z', UsageData: { Size: -1 } },
        { Name: 'unrelated', CreatedAt: '2026-08-01T00:00:00Z' },
      ],
    }
  }

  it('derives attachment from the dangling filter and narrows by prefix', async () => {
    const volumes = await listDockerVolumes(context(volumesRequest), { namePrefix: 'mol-' })
    expect(volumes.map((v) => [v.name, v.attached])).toEqual([
      ['mol-pool-orphan', false],
      ['mol-project-live', true],
    ])
  })

  it('reports an unknown size as null rather than zero', async () => {
    const volumes = await listDockerVolumes(context(volumesRequest), {
      namePrefix: 'mol-project',
    })
    expect(volumes[0].sizeBytes).toBeNull()
  })

  it('reports every volume as ATTACHED when attachment cannot be determined', async () => {
    // A volume is the only copy of a user's work, so an unreadable answer must
    // never authorize a reclaim sweep to delete it.
    const ctx = context(async (path) => {
      if (path.includes('dangling')) throw new Error('Docker API GET /volumes: 500 boom')
      return { Volumes: [{ Name: 'mol-pool-orphan' }] }
    })
    const volumes = await listDockerVolumes(ctx)
    expect(volumes).toEqual([
      { name: 'mol-pool-orphan', attached: true, createdAt: null, sizeBytes: null },
    ])
    expect(ctx.warn).toHaveBeenCalled()
  })

  it('propagates a failed enumeration', async () => {
    const ctx = context(async () => {
      throw new Error('Docker API GET /volumes: 500 boom')
    })
    await expect(listDockerVolumes(ctx)).rejects.toThrow(/500/)
  })
})

describe('updateContainerResources', () => {
  it('always recomputes swap alongside memory', async () => {
    // This call is the LAST writer on the adoption path. Updating Memory without
    // MemorySwap leaves the old swap ceiling, which silently strips the headroom
    // every creation path grants.
    const calls: Array<{ path: string; body?: unknown }> = []
    const ctx = context(async (path, _method, body) => {
      calls.push({ path, body })
      return {}
    })
    await updateContainerResources(ctx, 'container-1', { memoryMB: 1280, cpu: 1, pidsLimit: 512 })
    expect(calls[0].body).toEqual({
      NanoCPUs: 1e9,
      Memory: 1280 * 1024 * 1024,
      MemorySwap: 2 * 1280 * 1024 * 1024,
      PidsLimit: 512,
    })
  })

  it('throws for a ceiling it cannot enforce instead of accepting it silently', async () => {
    const ctx = context(vi.fn())
    await expect(updateContainerResources(ctx, 'container-1', { diskMB: 1024 })).rejects.toThrow(
      /cannot cap a container or volume size/,
    )
  })

  it('sends nothing when nothing was asked for', async () => {
    const request = vi.fn()
    await updateContainerResources(context(request), 'container-1', {})
    expect(request).not.toHaveBeenCalled()
  })
})
