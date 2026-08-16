import { describe, expect, it } from 'vitest'

import { E2BSandboxProvider } from '../provider.js'
import type {
  E2BSandboxClientLike,
  E2BSandboxLike,
  E2BSandboxListItem,
  E2BSnapshotLike,
  E2BVolumeLike,
} from '../types.js'

// ---------------------------------------------------------------------------
// An E2B microVM is the only copy of a project's files, so the two ways to make
// them outlive it are the subject here:
//
//   • a VOLUME mounted at the app root — durable storage attached at create
//     time, which is why a pooled sandbox can never be given one afterwards;
//   • a SNAPSHOT of the sandbox — a persistent image a later sandbox boots from,
//     mapped onto the core's template capability.
//
// Every assertion below is about the same failure: an operation that could not
// look, or could not act, must never come back shaped like a successful one.
// ---------------------------------------------------------------------------

/** A minimal live sandbox; only what these tests touch is populated. */
function fakeSandbox(sandboxId: string): E2BSandboxLike {
  return {
    sandboxId,
    commands: {
      async run() {
        return { stdout: '', stderr: '', exitCode: 0 }
      },
    },
    files: {
      read: (async () => '') as E2BSandboxLike['files']['read'],
      async write() {
        return {}
      },
      async list() {
        return []
      },
      async remove() {},
    },
    getHost: (port) => `${port}-${sandboxId}.e2b.app`,
    async setTimeout() {},
    async kill() {},
  }
}

interface Harness {
  provider: E2BSandboxProvider
  createOpts: Array<Record<string, unknown>>
  volumes: E2BVolumeLike[]
  snapshots: E2BSnapshotLike[]
  deleted: string[]
}

function harness(
  opts: {
    volumes?: E2BVolumeLike[]
    snapshots?: E2BSnapshotLike[]
    sandboxes?: E2BSandboxListItem[]
    omit?: Array<keyof E2BSandboxClientLike>
    listVolumesThrows?: boolean
    volumeMountsOf?: Record<string, Array<{ name: string; path: string }>>
  } = {},
): Harness {
  const volumes = opts.volumes ? [...opts.volumes] : []
  const snapshots = opts.snapshots ? [...opts.snapshots] : []
  const createOpts: Array<Record<string, unknown>> = []
  const deleted: string[] = []

  const client: E2BSandboxClientLike = {
    async create(templateId, createOptions) {
      createOpts.push({ templateId, ...(createOptions ?? {}) })
      return fakeSandbox('sbx-new')
    },
    async connect(id) {
      return fakeSandbox(id)
    },
    async list() {
      return opts.sandboxes ?? []
    },
    async getInfo(sandboxId) {
      return {
        sandboxId,
        state: 'running',
        volumeMounts: opts.volumeMountsOf?.[sandboxId] ?? [],
      }
    },
    async createVolume(name) {
      const volume = { name, volumeId: `vol-${name}` }
      volumes.push(volume)
      return volume
    },
    async listVolumes() {
      if (opts.listVolumesThrows) throw new Error('E2B is unreachable')
      return volumes
    },
    async destroyVolume(volumeId) {
      const index = volumes.findIndex((v) => v.volumeId === volumeId)
      if (index < 0) return false
      volumes.splice(index, 1)
      return true
    },
    async createSnapshot(_sandboxId, name) {
      const snapshot = {
        snapshotId: `molecules-project/${name}:default`,
        names: [`molecules-project/${name}`],
      }
      const existing = snapshots.findIndex((s) => s.snapshotId === snapshot.snapshotId)
      if (existing >= 0) snapshots[existing] = snapshot
      else snapshots.push(snapshot)
      return snapshot
    },
    async listSnapshots(listOpts) {
      if (!listOpts?.name) return snapshots
      return snapshots.filter(
        (s) => s.names?.[0]?.endsWith(`/${listOpts.name}`) || s.snapshotId.includes(listOpts.name),
      )
    },
    async deleteSnapshot(snapshotId) {
      deleted.push(snapshotId)
      const index = snapshots.findIndex((s) => s.snapshotId === snapshotId)
      if (index < 0) return false
      snapshots.splice(index, 1)
      return true
    },
  }
  for (const key of opts.omit ?? []) delete client[key]
  return {
    provider: new E2BSandboxProvider({ apiKey: 'k', templateId: 'superset' }, client),
    createOpts,
    volumes,
    snapshots,
    deleted,
  }
}

describe('E2B volumes', () => {
  it('mounts the named volume at the path the caller gave', async () => {
    const h = harness()
    await h.provider.create({
      projectId: 'p1',
      volumeName: 'mol-project-p1',
      volumeMountPath: '/workspace/my-app',
    })
    expect(h.createOpts[0].volumeMounts).toEqual({ '/workspace/my-app': 'mol-project-p1' })
  })

  it('REFUSES to create when a volume is named without a mount path', async () => {
    const h = harness()
    // Defaulting to the workspace root would shadow the superset node_modules
    // and boot a project that cannot resolve a single import — so it throws.
    await expect(
      h.provider.create({ projectId: 'p1', volumeName: 'mol-project-p1' }),
    ).rejects.toThrow(/volumeMountPath/)
    expect(h.createOpts).toHaveLength(0)
  })

  it('passes no volumeMounts at all when the caller named no volume', async () => {
    const h = harness()
    await h.provider.create({ projectId: 'p1' })
    expect(h.createOpts[0]).not.toHaveProperty('volumeMounts')
  })

  it('createVolume is idempotent — an existing volume is not re-created', async () => {
    const h = harness({ volumes: [{ name: 'mol-project-p1', volumeId: 'vol-1' }] })
    await h.provider.createVolume('mol-project-p1')
    expect(h.volumes).toHaveLength(1)
    expect(h.volumes[0].volumeId).toBe('vol-1')
  })

  it('createVolume creates one that does not exist yet', async () => {
    const h = harness()
    await h.provider.createVolume('mol-project-p1')
    expect(h.volumes.map((v) => v.name)).toEqual(['mol-project-p1'])
  })

  it('removeVolume deletes by name and is a no-op for an absent volume', async () => {
    const h = harness({ volumes: [{ name: 'mol-project-p1', volumeId: 'vol-1' }] })
    await h.provider.removeVolume('mol-project-p1')
    expect(h.volumes).toHaveLength(0)
    await expect(h.provider.removeVolume('mol-project-p1')).resolves.toBeUndefined()
  })

  it('volumeExists answers the question it was asked', async () => {
    const h = harness({ volumes: [{ name: 'mol-project-p1', volumeId: 'vol-1' }] })
    await expect(h.provider.volumeExists('mol-project-p1')).resolves.toBe(true)
    await expect(h.provider.volumeExists('mol-project-p2')).resolves.toBe(false)
  })

  it('volumeExists THROWS when it cannot look, never answering false', async () => {
    // A control plane reads `false` as "the user's files are gone" and records a
    // loss. "I could not look" must not wear that shape.
    const h = harness({ listVolumesThrows: true })
    await expect(h.provider.volumeExists('mol-project-p1')).rejects.toThrow(/unreachable/)
  })

  it('throws instead of silently no-op-ing when the account has no volume API', async () => {
    const h = harness({ omit: ['createVolume', 'listVolumes', 'destroyVolume'] })
    await expect(h.provider.createVolume('mol-project-p1')).rejects.toThrow(/volume API/)
    await expect(h.provider.volumeExists('mol-project-p1')).rejects.toThrow(/volume API/)
    await expect(h.provider.removeVolume('mol-project-p1')).rejects.toThrow(/volume API/)
    await expect(h.provider.listVolumes()).rejects.toThrow(/volume API/)
  })

  it('listVolumes OBSERVES attachment from the sandbox listing, paused included', async () => {
    const h = harness({
      volumes: [
        { name: 'mol-project-live', volumeId: 'vol-1' },
        { name: 'mol-project-paused', volumeId: 'vol-2' },
        { name: 'mol-project-orphan', volumeId: 'vol-3' },
        { name: 'other-thing', volumeId: 'vol-4' },
      ],
      sandboxes: [
        {
          sandboxId: 's1',
          state: 'running',
          volumeMounts: [{ name: 'mol-project-live', path: '/workspace/my-app' }],
        },
        {
          sandboxId: 's2',
          state: 'paused',
          volumeMounts: [{ name: 'mol-project-paused', path: '/workspace/my-app' }],
        },
      ],
    })
    const all = await h.provider.listVolumes({ namePrefix: 'mol-project-' })
    expect(all.map((v) => [v.name, v.attached])).toEqual([
      ['mol-project-live', true],
      ['mol-project-paused', true],
      ['mol-project-orphan', false],
    ])
    const orphans = await h.provider.listVolumes({ namePrefix: 'mol-project-', attached: false })
    expect(orphans.map((v) => v.name)).toEqual(['mol-project-orphan'])
  })
})

describe('E2B snapshots as the core template capability', () => {
  it('commitTemplate captures under the caller’s own id', async () => {
    const h = harness()
    const template = await h.provider.commitTemplate({
      sandboxId: 'sbx-1',
      templateId: 'mol-project-p1',
      label: 'restore point',
    })
    expect(template.id).toBe('mol-project-p1')
    expect(template.ref).toBe('molecules-project/mol-project-p1:default')
    expect(template.label).toBe('restore point')
    expect(h.snapshots).toHaveLength(1)
  })

  it('re-committing the same id replaces it rather than accumulating', async () => {
    const h = harness()
    await h.provider.commitTemplate({ sandboxId: 'sbx-1', templateId: 'mol-project-p1' })
    await h.provider.commitTemplate({ sandboxId: 'sbx-1', templateId: 'mol-project-p1' })
    expect(h.snapshots).toHaveLength(1)
  })

  it('REFUSES to capture a path that lives on a mounted volume', async () => {
    // The snapshot images the sandbox's own disk. Committing anyway would make a
    // template that boots into a workspace missing exactly the files asked for.
    const h = harness({
      volumeMountsOf: { 'sbx-1': [{ name: 'mol-project-p1', path: '/workspace/my-app' }] },
    })
    await expect(
      h.provider.commitTemplate({
        sandboxId: 'sbx-1',
        templateId: 'mol-project-p1',
        capturePaths: ['/workspace/my-app/api'],
      }),
    ).rejects.toThrow(/mounted volume/)
    expect(h.snapshots).toHaveLength(0)
  })

  it('captures happily when the capture paths are on the sandbox’s own disk', async () => {
    const h = harness({
      volumeMountsOf: { 'sbx-1': [{ name: 'other', path: '/mnt/other' }] },
    })
    await expect(
      h.provider.commitTemplate({
        sandboxId: 'sbx-1',
        templateId: 'mol-project-p1',
        capturePaths: ['/workspace/my-app'],
      }),
    ).resolves.toMatchObject({ id: 'mol-project-p1' })
  })

  it('getTemplate returns the caller’s id, not E2B’s namespaced reference', async () => {
    const h = harness({
      snapshots: [
        {
          snapshotId: 'molecules-project/mol-project-p1:default',
          names: ['molecules-project/mol-project-p1'],
        },
      ],
    })
    const template = await h.provider.getTemplate('mol-project-p1')
    expect(template?.id).toBe('mol-project-p1')
    expect(template?.ref).toBe('molecules-project/mol-project-p1:default')
  })

  it('getTemplate answers null only for a genuinely absent snapshot', async () => {
    const h = harness()
    await expect(h.provider.getTemplate('mol-project-p1')).resolves.toBeNull()
  })

  it('getTemplate reports inUse when a sandbox is booted from it', async () => {
    const h = harness({
      snapshots: [
        {
          snapshotId: 'molecules-project/mol-project-p1:default',
          names: ['molecules-project/mol-project-p1'],
        },
      ],
      sandboxes: [{ sandboxId: 's1', state: 'running', name: 'mol-project-p1' }],
    })
    await expect(h.provider.getTemplate('mol-project-p1')).resolves.toMatchObject({ inUse: true })
  })

  it('listTemplates filters by the caller’s id prefix', async () => {
    const h = harness({
      snapshots: [
        {
          snapshotId: 'molecules-project/mol-project-p1:default',
          names: ['molecules-project/mol-project-p1'],
        },
        {
          snapshotId: 'molecules-project/warm-base:default',
          names: ['molecules-project/warm-base'],
        },
      ],
    })
    const listed = await h.provider.listTemplates({ idPrefix: 'mol-project-' })
    expect(listed.map((t) => t.id)).toEqual(['mol-project-p1'])
  })

  it('removeTemplate REFUSES while a sandbox still boots from it', async () => {
    const h = harness({
      snapshots: [
        {
          snapshotId: 'molecules-project/mol-project-p1:default',
          names: ['molecules-project/mol-project-p1'],
        },
      ],
      sandboxes: [{ sandboxId: 's1', state: 'running', name: 'mol-project-p1' }],
    })
    await expect(h.provider.removeTemplate('mol-project-p1')).rejects.toThrow(/currently running/)
    expect(h.deleted).toHaveLength(0)
  })

  it('removeTemplate deletes an unused one, and absence is a success', async () => {
    const h = harness({
      snapshots: [
        {
          snapshotId: 'molecules-project/mol-project-p1:default',
          names: ['molecules-project/mol-project-p1'],
        },
      ],
    })
    await h.provider.removeTemplate('mol-project-p1')
    expect(h.deleted).toEqual(['molecules-project/mol-project-p1:default'])
    await expect(h.provider.removeTemplate('mol-project-p1')).resolves.toBeUndefined()
  })

  it('boots a sandbox from a template id, which is how a restore happens', async () => {
    const h = harness()
    await h.provider.create({ projectId: 'p1', templateId: 'mol-project-p1' })
    expect(h.createOpts[0].templateId).toBe('mol-project-p1')
  })

  it('throws instead of pretending when the SDK exposes no snapshot API', async () => {
    const h = harness({ omit: ['createSnapshot', 'listSnapshots', 'deleteSnapshot'] })
    await expect(
      h.provider.commitTemplate({ sandboxId: 'sbx-1', templateId: 'mol-project-p1' }),
    ).rejects.toThrow(/snapshot API/)
    await expect(h.provider.getTemplate('mol-project-p1')).rejects.toThrow(/snapshot API/)
    await expect(h.provider.listTemplates()).rejects.toThrow(/snapshot API/)
    await expect(h.provider.removeTemplate('mol-project-p1')).rejects.toThrow(/snapshot API/)
  })
})
