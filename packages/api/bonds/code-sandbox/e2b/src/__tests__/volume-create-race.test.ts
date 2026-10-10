/**
 * Volume creation is idempotent across a RACE, not just across a sequence.
 *
 * Callers create the project's volume on every boot (they cannot know whether a
 * previous sandbox already made it), so `createVolume()` looks the volume up
 * first and returns when it is already there. That lookup alone cannot cover two
 * boots of one project racing it — a retried queue job next to the user's own
 * Start, the same shape that makes the stale-Machine cleanup necessary: both see
 * "no volume", both create, and the loser's CREATE throws. The loser's boot then
 * failed on a volume that actually exists.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { E2BSandboxProvider } from '../provider.js'
import type { E2BSandboxClientLike, E2BVolumeLike } from '../types.js'

/**
 * A client that only speaks the volume API.
 *
 * @param volumes - The mutable volume listing the client answers with.
 * @param onCreate - Runs inside `createVolume` (to model the racing writer).
 * @returns The fake client.
 */
function volumeClient(
  volumes: E2BVolumeLike[],
  onCreate: (name: string) => Promise<E2BVolumeLike>,
): E2BSandboxClientLike {
  return {
    async create() {
      throw new Error('not used')
    },
    async connect() {
      throw new Error('not used')
    },
    async list() {
      return []
    },
    async listVolumes() {
      return volumes
    },
    async createVolume(name) {
      return onCreate(name)
    },
  } satisfies E2BSandboxClientLike
}

describe('E2B createVolume — a lost create race is not a failed boot', () => {
  it('treats a create that lost the race as success once the volume is there', async () => {
    const volumes: E2BVolumeLike[] = []
    const client = volumeClient(volumes, async (name) => {
      // The other boot's create landed between our lookup and our create.
      volumes.push({ name, volumeId: `vol-${name}` })
      throw new Error(`volume "${name}" already exists`)
    })
    const provider = new E2BSandboxProvider({ apiKey: 'test' }, client)

    await expect(provider.createVolume('proj-vol')).resolves.toBeUndefined()
  })

  it('still rethrows a create that failed for any other reason', async () => {
    const volumes: E2BVolumeLike[] = []
    const client = volumeClient(volumes, async () => {
      // Volumes are a private beta: a real refusal leaves the volume ABSENT, and
      // must keep surfacing rather than being mistaken for the race above.
      throw new Error('use of volumes is not enabled')
    })
    const provider = new E2BSandboxProvider({ apiKey: 'test' }, client)

    await expect(provider.createVolume('proj-vol')).rejects.toThrow(/volumes is not enabled/)
  })

  it('rethrows the create error even when the second look cannot be read', async () => {
    const client = volumeClient([], async () => {
      throw new Error('volume create blew up')
    })
    // The FIRST lookup (before the create) answers; only the re-check after the
    // failed create is unreadable.
    let lookups = 0
    client.listVolumes = async () => {
      lookups++
      if (lookups > 1) throw new Error('listing unavailable')
      return []
    }
    const provider = new E2BSandboxProvider({ apiKey: 'test' }, client)

    await expect(provider.createVolume('proj-vol')).rejects.toThrow(/volume create blew up/)
  })

  it('does not create a volume that is already there', async () => {
    const volumes: E2BVolumeLike[] = [{ name: 'proj-vol', volumeId: 'vol-1' }]
    let creates = 0
    const client = volumeClient(volumes, async (name) => {
      creates++
      return { name, volumeId: `vol-${creates}` }
    })
    const provider = new E2BSandboxProvider({ apiKey: 'test' }, client)

    await expect(provider.createVolume('proj-vol')).resolves.toBeUndefined()
    expect(creates).toBe(0)
  })
})
