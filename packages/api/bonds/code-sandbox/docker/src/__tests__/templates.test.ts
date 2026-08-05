/**
 * Tests for the Docker template capability.
 *
 * The cases here are the ones where a wrong answer is silent and expensive: a
 * capture that commits an empty workspace, an eviction that deletes the image a
 * live sandbox boots from, a push that reports success in its status line and
 * failure in its body, and a lookup that reports a daemon outage as a cache miss.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import {
  assertTemplateId,
  commitTemplate,
  fetchTemplate,
  getTemplate,
  listTemplates,
  publishTemplate,
  removeTemplate,
  type TemplateContext,
} from '../templates.js'

/** One recorded Docker Engine API call. */
interface Call {
  path: string
  method: string
  body?: unknown
  headers?: Record<string, string>
}

/** Scripted daemon behaviour for a test. */
interface Script {
  /** Response for `GET /images/<ref>/json`, or an error to throw. */
  image?: unknown | Error
  /** Response for `GET /images/json`. */
  imageList?: unknown
  /** Response for `GET /containers/json?all=true`, or an error to throw. */
  containers?: unknown | Error
  /** Response body for a push/pull, which streams JSON lines with a 200 status. */
  registryStream?: string
  /** Error thrown by the pull request itself. */
  pullError?: Error
  /** Exit code every exec reports. */
  execExit?: number
}

/**
 * Build a template context backed by a scripted daemon plus a call log.
 *
 * @param script - Scripted responses.
 * @param overrides - Context fields to override (registry, repository, …).
 * @returns The context and the recorded calls.
 */
function harness(
  script: Script = {},
  overrides: Partial<TemplateContext> = {},
): { ctx: TemplateContext; calls: Call[]; uploads: string[] } {
  const calls: Call[] = []
  const uploads: string[] = []

  const request: TemplateContext['request'] = async (path, method = 'GET', body, _t, headers) => {
    calls.push({ path, method, body, headers })

    if (path.startsWith('/images/json')) return script.imageList ?? []
    if (path === '/containers/json?all=true') {
      if (script.containers instanceof Error) throw script.containers
      return script.containers ?? []
    }
    if (/^\/images\/[^/]+\/json$/.test(path)) {
      if (script.image instanceof Error) throw script.image
      if (script.image === undefined) throw new Error('Docker API GET: 404 no such image')
      return script.image
    }
    if (path.startsWith('/images/create')) {
      if (script.pullError) throw script.pullError
      return script.registryStream ?? '{"status":"Downloaded"}'
    }
    if (path.includes('/push')) return script.registryStream ?? '{"status":"Pushed"}'
    if (path.includes('/tag')) return ''
    if (path.startsWith('/containers/create')) return { Id: 'capture-1' }
    if (path.endsWith('/exec')) return { Id: 'exec-1' }
    if (path.startsWith('/exec/') && path.endsWith('/json')) {
      return { ExitCode: script.execExit ?? 0 }
    }
    return {}
  }

  const ctx: TemplateContext = {
    request,
    download: async (path) => {
      calls.push({ path, method: 'DOWNLOAD' })
      return (async function* () {
        yield new Uint8Array([1, 2, 3])
      })()
    },
    upload: async (path, body) => {
      uploads.push(path)
      for await (const _chunk of body) {
        // Drain so the fake behaves like a real consumer.
      }
    },
    baseImage: 'molecule-sandbox:latest',
    repository: 'molecule-sandbox-template',
    registry: '',
    registryAuth: 'e30=',
    labelPrefix: 'molecule-sandbox',
    warn: vi.fn(),
    debug: vi.fn(),
    ...overrides,
  }
  return { ctx, calls, uploads }
}

/** A committed image payload the daemon would return for a template. */
function imagePayload(overrides: Record<string, unknown> = {}): unknown {
  return {
    Id: 'sha256:abcdef0123456789',
    Created: '2026-08-01T00:00:00Z',
    Size: 4_000_000,
    Config: { Labels: { 'molecule-sandbox.template.id': 'cfg-1' } },
    ...overrides,
  }
}

describe('assertTemplateId', () => {
  it('rejects ids that cannot be a Docker tag rather than sanitizing them', () => {
    // Sanitizing would map two distinct ids onto one tag, silently overwriting
    // one project's template with another's.
    expect(() => assertTemplateId('has/slash')).toThrow(/Invalid template id/)
    expect(() => assertTemplateId('has space')).toThrow(/Invalid template id/)
    expect(() => assertTemplateId('.leading-dot')).toThrow(/Invalid template id/)
    expect(() => assertTemplateId('')).toThrow(/Invalid template id/)
  })

  it('accepts ordinary hash-shaped ids', () => {
    expect(() => assertTemplateId('cache-9f8e7d6c5b4a3210')).not.toThrow()
  })
})

describe('commitTemplate', () => {
  it('captures the caller-named paths into a volume-less container and commits that', async () => {
    const { ctx, calls, uploads } = harness({ image: imagePayload() })

    await commitTemplate(ctx, {
      sandboxId: 'sandbox-1',
      templateId: 'cfg-1',
      capturePaths: ['/workspace'],
    })

    // The archive is read from the SOURCE sandbox and written into the throwaway
    // container's parent directory — committing the sandbox itself would produce
    // an image with an empty workspace, because a volume is not in the writable
    // layer.
    expect(calls.some((c) => c.path === '/containers/sandbox-1/archive?path=%2Fworkspace')).toBe(
      true,
    )
    expect(uploads).toEqual(['/containers/capture-1/archive?path=%2F'])
    expect(calls.some((c) => c.method === 'POST' && c.path.startsWith('/commit?'))).toBe(true)
    const commit = calls.find((c) => c.path.startsWith('/commit?'))!
    expect(commit.path).toContain('repo=molecule-sandbox-template')
    expect(commit.path).toContain('tag=cfg-1')
  })

  it('hardens the throwaway container that handles tenant bytes', async () => {
    const { ctx, calls } = harness({ image: imagePayload() })

    await commitTemplate(ctx, { sandboxId: 'sandbox-1', templateId: 'cfg-1' })

    const create = calls.find((c) => c.path.startsWith('/containers/create'))!
    const hostConfig = (create.body as { HostConfig: Record<string, unknown> }).HostConfig
    // No network at all: it is driven over the Docker socket, and a container on
    // any other network sits outside the sandbox firewall's subnet match.
    expect(hostConfig.NetworkMode).toBe('none')
    expect(hostConfig.CapDrop).toEqual(['ALL'])
    expect(hostConfig.SecurityOpt).toEqual(['no-new-privileges'])
    expect(hostConfig.Memory).toBeGreaterThan(0)
    expect(hostConfig.PidsLimit).toBe(256)
  })

  it('strips setuid and setgid from the captured tree', async () => {
    const { ctx, calls } = harness({ image: imagePayload() })

    await commitTemplate(ctx, {
      sandboxId: 'sandbox-1',
      templateId: 'cfg-1',
      capturePaths: ['/workspace'],
    })

    // Without this a tenant plants a setuid-root binary in an image that OTHER
    // tenants boot.
    const execs = calls
      .filter((c) => c.path === '/containers/capture-1/exec')
      .map((c) => (c.body as { Cmd: string[] }).Cmd[2] ?? '')
    expect(execs.some((cmd) => cmd.includes('-perm /6000') && cmd.includes('chmod a-s'))).toBe(true)
  })

  it('removes the throwaway container even when the capture fails', async () => {
    const { ctx, calls } = harness({ execExit: 1 })

    await expect(
      commitTemplate(ctx, {
        sandboxId: 'sandbox-1',
        templateId: 'cfg-1',
        capturePaths: ['/workspace'],
      }),
    ).rejects.toThrow(/Command failed inside capture container/)

    expect(calls.some((c) => c.method === 'DELETE' && c.path.includes('capture-1'))).toBe(true)
  })

  it('rejects a capture path that is not absolute', async () => {
    const { ctx } = harness({ image: imagePayload() })
    await expect(
      commitTemplate(ctx, {
        sandboxId: 'sandbox-1',
        templateId: 'cfg-1',
        capturePaths: ['../etc'],
      }),
    ).rejects.toThrow(/Invalid capture path/)
  })
})

describe('getTemplate', () => {
  it('returns null for a genuinely absent template', async () => {
    const { ctx } = harness()
    expect(await getTemplate(ctx, 'missing-1')).toBeNull()
  })

  it('THROWS when it could not look, rather than reporting a cache miss', async () => {
    // A daemon hiccup reported as absence turns every boot into a full cold
    // rebuild, silently and indefinitely.
    const { ctx } = harness({ image: new Error('Docker API GET: 500 server error') })
    await expect(getTemplate(ctx, 'cfg-1')).rejects.toThrow(/500/)
  })

  it('reports inUse when a container is backed by the template', async () => {
    const { ctx } = harness({
      image: imagePayload(),
      containers: [
        { Image: 'molecule-sandbox-template:cfg-1', ImageID: 'sha256:abcdef0123456789' },
      ],
    })
    expect((await getTemplate(ctx, 'cfg-1'))?.inUse).toBe(true)
  })

  it('reports inUse when it CANNOT tell what is in use', async () => {
    // A wrong `false` here authorizes deleting the filesystem a live sandbox
    // boots from, so an unreadable answer resolves to the safe side.
    const { ctx } = harness({
      image: imagePayload(),
      containers: new Error('Docker API GET: 500 server error'),
    })
    expect((await getTemplate(ctx, 'cfg-1'))?.inUse).toBe(true)
  })

  it('reports not-in-use when nothing references it', async () => {
    const { ctx } = harness({ image: imagePayload(), containers: [] })
    const template = await getTemplate(ctx, 'cfg-1')
    expect(template?.inUse).toBe(false)
    expect(template?.ref).toBe('molecule-sandbox-template:cfg-1')
    expect(template?.sizeBytes).toBe(4_000_000)
  })
})

describe('listTemplates', () => {
  it('propagates an enumeration failure instead of returning an empty list', async () => {
    // The caller's next step is deletion; "[] because the query broke" would tell
    // it nothing is over budget and it would believe that.
    const { ctx } = harness()
    const failing: TemplateContext = {
      ...ctx,
      request: async (path) => {
        if (path.startsWith('/images/json')) throw new Error('Docker API GET: 500 boom')
        return []
      },
    }
    await expect(listTemplates(failing)).rejects.toThrow(/500/)
  })

  it('narrows by id prefix and reads the id back from the label', async () => {
    const { ctx } = harness({
      imageList: [
        {
          Id: 'sha256:aaa',
          RepoTags: ['molecule-sandbox-template:cache-1'],
          Created: 1_760_000_000,
          Size: 10,
          Labels: { 'molecule-sandbox.template.id': 'cache-1' },
        },
        {
          Id: 'sha256:bbb',
          RepoTags: ['molecule-sandbox-template:snap-1'],
          Created: 1_760_000_100,
          Size: 20,
          Labels: null,
        },
      ],
      containers: [],
    })
    const templates = await listTemplates(ctx, { idPrefix: 'cache-' })
    expect(templates.map((template) => template.id)).toEqual(['cache-1'])
    expect(templates[0].createdAt).toBe(new Date(1_760_000_000_000).toISOString())
  })
})

describe('removeTemplate', () => {
  it('refuses while a sandbox is still backed by the template', async () => {
    const { ctx } = harness({
      image: imagePayload(),
      containers: [{ Image: 'molecule-sandbox-template:cfg-1' }],
    })
    await expect(removeTemplate(ctx, 'cfg-1')).rejects.toThrow(/still\s+backed by it/)
  })

  it('is a no-op for a template that is already gone', async () => {
    const { ctx, calls } = harness()
    await expect(removeTemplate(ctx, 'cfg-1')).resolves.toBeUndefined()
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
  })

  it('deletes without force, leaving the daemon a second veto', async () => {
    const { ctx, calls } = harness({ image: imagePayload(), containers: [] })
    await removeTemplate(ctx, 'cfg-1')
    const del = calls.find((c) => c.method === 'DELETE')!
    expect(del.path).toContain('/images/')
    expect(del.path).not.toContain('force')
  })
})

describe('publishTemplate and fetchTemplate', () => {
  it('throws when no shared store is configured, rather than reporting "not found"', async () => {
    const { ctx } = harness({ image: imagePayload(), containers: [] })
    await expect(publishTemplate(ctx, 'cfg-1')).rejects.toThrow(/No shared template store/)
    await expect(fetchTemplate(ctx, 'cfg-1')).rejects.toThrow(/No shared template store/)
  })

  it('fails a push whose error arrives inside a 200 response body', async () => {
    // The daemon answers 200 and then streams progress; a denied push shows up
    // as an `error` object minutes later. Trusting the status line is how a
    // fleet believes every host has a template only one host has.
    const { ctx } = harness(
      {
        image: imagePayload(),
        containers: [],
        registryStream:
          '{"status":"Preparing"}\n{"errorDetail":{"message":"denied: requested access to the resource is denied"},"error":"denied"}\n',
      },
      { registry: 'registry.example.com' },
    )
    await expect(publishTemplate(ctx, 'cfg-1')).rejects.toThrow(/denied/)
  })

  it('sends the registry credential the daemon requires even anonymously', async () => {
    const { ctx, calls } = harness(
      { image: imagePayload(), containers: [] },
      { registry: 'registry.example.com' },
    )
    await publishTemplate(ctx, 'cfg-1')
    const push = calls.find((c) => c.path.includes('/push'))!
    expect(push.headers?.['X-Registry-Auth']).toBe('e30=')
  })

  it('returns null when the registry does not have the template', async () => {
    const { ctx } = harness(
      { pullError: new Error('Docker API POST: 404 manifest unknown') },
      { registry: 'registry.example.com' },
    )
    expect(await fetchTemplate(ctx, 'cfg-1')).toBeNull()
  })

  it('throws when the pull failed for any other reason', async () => {
    const { ctx } = harness(
      { pullError: new Error('Docker API POST: 500 registry unreachable') },
      { registry: 'registry.example.com' },
    )
    await expect(fetchTemplate(ctx, 'cfg-1')).rejects.toThrow(/unreachable/)
  })

  it('tags the pulled image locally so getTemplate finds it', async () => {
    const { ctx, calls } = harness(
      { image: imagePayload(), containers: [] },
      { registry: 'registry.example.com' },
    )
    const template = await fetchTemplate(ctx, 'cfg-1')
    expect(template?.ref).toBe('molecule-sandbox-template:cfg-1')
    expect(calls.some((c) => c.path.includes('/tag?repo=molecule-sandbox-template'))).toBe(true)
  })
})
