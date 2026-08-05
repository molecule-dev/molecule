/**
 * Tests for host-capacity measurement.
 *
 * Every case here is about the difference between "there is none left" and "I
 * could not measure it". A caller compares headroom against its own floors, so a
 * fabricated zero refuses every boot and a fabricated number admits one into a
 * host that then fails every write.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import type { CapacityContext } from '../capacity.js'
import { measureDockerCapacity } from '../capacity.js'

/** Build a capacity context with sensible local-daemon defaults. */
function context(overrides: Partial<CapacityContext> = {}): CapacityContext {
  return {
    request: async () => ({ DockerRootDir: '/var/lib/docker' }),
    daemonIsLocal: true,
    statfs: async () => ({ bsize: 4096, bavail: 10_000_000, ffree: 5_000_000 }),
    availableMemoryBytes: async () => 4 * 1024 ** 3,
    warn: vi.fn(),
    ...overrides,
  }
}

describe('measureDockerCapacity', () => {
  it('measures the daemon storage root plus available memory', async () => {
    const capacity = await measureDockerCapacity(context())
    expect(capacity.headroom).toEqual({
      diskBytes: 4096 * 10_000_000,
      inodes: 5_000_000,
      memoryBytes: 4 * 1024 ** 3,
    })
    expect(capacity.detail).toContain('/var/lib/docker')
  })

  it('has no admission opinion of its own', async () => {
    // Docker has no quota to consult, so the floors and the refusal stay with
    // the caller. Inventing a verdict here would move policy into the bond.
    expect((await measureDockerCapacity(context())).admits).toBeNull()
  })

  it('reports NOTHING for a remote daemon rather than this machine s numbers', async () => {
    const capacity = await measureDockerCapacity(context({ daemonIsLocal: false }))
    expect(capacity.headroom).toEqual({})
    expect(capacity.detail).toMatch(/TCP endpoint/)
  })

  it('omits inodes on a filesystem with dynamic inode allocation', async () => {
    // btrfs/xfs report 0 free nodes, which means "not applicable". Reported as
    // zero it would look exhausted and refuse every boot on such a host.
    const capacity = await measureDockerCapacity(
      context({ statfs: async () => ({ bsize: 4096, bavail: 100, ffree: 0 }) }),
    )
    expect(capacity.headroom.inodes).toBeUndefined()
    expect(capacity.headroom.diskBytes).toBe(409_600)
  })

  it('omits a metric it could not read, and says so', async () => {
    const capacity = await measureDockerCapacity(
      context({
        statfs: async () => {
          throw new Error('ENOENT')
        },
        availableMemoryBytes: async () => null,
      }),
    )
    expect(capacity.headroom).toEqual({})
    expect(capacity.detail).toMatch(/unmeasurable/)
    expect(capacity.detail).toMatch(/available memory is unreadable/)
  })

  it('falls back to the default storage root when the daemon will not say', async () => {
    const paths: string[] = []
    const capacity = await measureDockerCapacity(
      context({
        request: async () => {
          throw new Error('Docker API GET /info: 500 boom')
        },
        statfs: async (path) => {
          paths.push(path)
          return { bsize: 4096, bavail: 1, ffree: 1 }
        },
      }),
    )
    expect(paths).toEqual(['/var/lib/docker'])
    expect(capacity.detail).toMatch(/assumed \/var\/lib\/docker/)
  })
})
