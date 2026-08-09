/**
 * Tests for warm-start templates on Fly: the capture/restore scripts and the
 * properties they are there to enforce, the storage-configuration resolution,
 * and the four contract rules the core states in prose — a missing template
 * FAILS a create, a failed enumeration THROWS instead of returning `[]`, an
 * unreadable usage lookup resolves to IN USE, and a capture with no paths is
 * refused rather than storing an empty template.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFetchDouble, createStoreDouble, mockLogger, type StoreDouble } from './helpers.js'

vi.mock('@molecule/api-bond', () => ({ getLogger: () => mockLogger }))
vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}))

const { FlyApiClient } = await import('../api.js')
const { createProvider } = await import('../provider.js')
const templates = await import('../templates.js')
const { createTemplateStore, resolveTemplateStorage } = await import('../storage.js')
const { shellQuote } = await import('../utilities.js')

import type { ExecResult } from '@molecule/api-code-sandbox'

import type { FlyioConfig } from '../types.js'

const PROJECT_ID = 'a3f1c0de-0000-4000-8000-000000000001'
const APP = `mol-sandbox-${PROJECT_ID}`
const PREFIX = 'molecule-sandbox-templates'
const TEMPLATE = 'react-postgres-v3'
const MANIFEST_KEY = `${PREFIX}/${TEMPLATE}/manifest.json`
const ARCHIVE_KEY = `${PREFIX}/${TEMPLATE}/archive.tar.gz`

const OK: ExecResult = { stdout: '', stderr: '', exitCode: 0 }

/** A recorded call to the context's `exec`. */
interface RecordedExec {
  app: string
  machineId: string
  command: string
  timeoutMs: number
}

/**
 * Builds a template context over an in-memory store with a scripted `exec`.
 * @param store - The store double.
 * @param results - Results returned by successive `exec` calls; the last repeats.
 * @returns The context plus the recorded exec calls.
 */
function makeContext(
  store: StoreDouble | null,
  results: ExecResult[] = [OK],
): { ctx: templates.TemplateContext; execs: RecordedExec[]; started: string[] } {
  const execs: RecordedExec[] = []
  const started: string[] = []
  let index = 0
  const ctx: templates.TemplateContext = {
    store,
    async exec(app, machineId, command, timeoutMs) {
      execs.push({ app, machineId, command, timeoutMs })
      const result = results[Math.min(index, results.length - 1)] as ExecResult
      index++
      return result
    },
    async ensureStarted(app, machineId) {
      started.push(`${app}:${machineId}`)
    },
    parseSandboxId(id: string) {
      const at = id.indexOf(':')
      return { app: id.slice(0, at), machineId: id.slice(at + 1) }
    },
    presignExpirySeconds: 3600,
    transferTimeoutMs: 900_000,
    maxArchiveBytes: templates.MAX_ARCHIVE_BYTES,
    warn: mockLogger.warn,
    debug: mockLogger.debug,
  }
  return { ctx, execs, started }
}

/**
 * Seeds a complete, usable template into a store double.
 * @param store - The store double.
 * @param capturePaths - Paths recorded in the manifest.
 */
function seedTemplate(store: StoreDouble, capturePaths = ['/workspace']): void {
  store.seed(
    MANIFEST_KEY,
    JSON.stringify({
      schema: 1,
      id: TEMPLATE,
      capturePaths,
      createdAt: '2026-08-01T00:00:00.000Z',
      sizeBytes: 1024,
    }),
  )
  store.seed(ARCHIVE_KEY, 'x'.repeat(1024))
}

/**
 * Builds a provider wired to a fetch double and a store double.
 * @param store - The template store double, or `null` for "not configured".
 * @param double - The fetch double.
 * @param config - Provider configuration overrides.
 * @returns The provider.
 */
function makeProvider(
  store: StoreDouble | null,
  double: ReturnType<typeof createFetchDouble> = createFetchDouble(),
  config: FlyioConfig = {},
) {
  const client = new FlyApiClient({
    token: () => 'tok',
    baseUrl: 'https://api.machines.dev/v1',
    fetchImpl: double.fetch,
    sleep: async () => {},
  })
  return createProvider(
    // Kept under the 55 s direct-exec budget so the transfer does not take the
    // detach-and-poll path, which would make these tests sleep for real.
    { orgSlug: 'acme', region: 'iad', templateTransferTimeoutMs: 30_000, ...config },
    client,
    store,
  )
}

/**
 * Queues the happy-path Machines API responses for a `create()`.
 * @param double - The fetch double.
 * @param exec - The exec response the restore receives.
 * @returns The same double, for chaining.
 */
function queueCreate(
  double: ReturnType<typeof createFetchDouble>,
  exec: { exit_code: number; stderr?: string } = { exit_code: 0 },
) {
  return double
    .on(`GET /apps/${APP}`, { status: 404, body: { error: 'not found' } })
    .on('POST /apps', { status: 201, body: {} })
    .on(`POST /apps/${APP}/machines`, { body: { id: 'm1', state: 'created' } })
    .on(`POST /apps/${APP}/machines/m1/exec`, { body: { stdout: '', stderr: '', ...exec } })
}

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('template id and capture path validation', () => {
  it('rejects rather than sanitizes an id that is not a safe key segment', () => {
    for (const id of ['../escape', 'has/slash', '.leading-dot', 'has space', '', 'a'.repeat(112)]) {
      expect(() => templates.assertTemplateId(id)).toThrow(/Invalid template id/)
    }
    expect(() => templates.assertTemplateId('react_postgres-v3.1')).not.toThrow()
  })

  it('rejects a capture path that is relative, traversing, or a glob', () => {
    for (const path of ['workspace', '/work/../etc', '/work*', '/work?', '/work[a]', '/work\nx']) {
      expect(() => templates.assertCapturePath(path)).toThrow(/Invalid capture path/)
    }
    expect(() => templates.assertCapturePath('/workspace')).not.toThrow()
  })

  it('turns an absolute capture path into a relative archive member', () => {
    expect(templates.archiveMember('/workspace')).toBe('workspace')
    expect(templates.archiveMember('/opt/tools/')).toBe('opt/tools')
  })
})

describe('the restore script — the tenant boundary', () => {
  const command = templates.buildRestoreCommand(['/workspace', '/opt/cache'], 'https://url/x?sig=1')

  it('extracts ONLY the manifest paths, as tar member selectors', () => {
    expect(command).toContain(`-xzf "$archive" 'workspace' 'opt/cache'`)
  })

  it('refuses to restore ownership or mode bits from the archive', () => {
    expect(command).toContain('--no-same-owner')
    expect(command).toContain('--no-same-permissions')
  })

  it('strips setuid/setgid AND fails the restore if any survived', () => {
    expect(command).toContain(`-perm /6000 -exec chmod a-s {} +`)
    expect(command).toContain('leftover=$(find')
    expect(command).toContain(`exit ${templates.EXIT_SETUID_SURVIVED}`)
  })

  it('downloads to a file rather than piping into tar, so a failed fetch cannot look like a success', () => {
    expect(command).toContain('curl --fail-with-body')
    expect(command).toContain('-o "$archive"')
    expect(command).not.toMatch(/curl[^\n]*\|\s*tar/)
  })

  it('aborts on the first failing step', () => {
    expect(command.split('\n')[0]).toBe('set -e')
  })

  it('single-quotes the presigned URL so its query cannot break out of the shell', () => {
    const hostile = "https://u/x?a=1&b=2';id;'"
    const script = templates.buildRestoreCommand(['/workspace'], hostile)
    expect(script).toContain(shellQuote(hostile))
    // The injected `;id;` never reaches the shell as a command separator.
    expect(script).not.toContain(`b=2';id;'`)
  })
})

describe('the capture script', () => {
  const command = templates.buildCaptureCommand(['/workspace'], 'https://url/put', 1234)

  it('archives the named paths relative to /, masking uids and setuid on the way OUT too', () => {
    expect(command).toContain(
      `tar -C / --numeric-owner --owner=0 --group=0 --mode='a-s' --exclude='node_modules' -czf "$archive" 'workspace'`,
    )
  })

  it('excludes node_modules — the image rootfs superset provides it on restore', () => {
    expect(command).toContain(`--exclude='node_modules'`)
  })

  it('tolerates tar exit 1 (files changed) but fails on anything worse', () => {
    expect(command).toContain(`echo 'MOL_TAR_FILES_CHANGED' >&2`)
    expect(command).toContain(`-gt 1 ]; then rm -f "$archive"; exit ${templates.EXIT_TAR_FAILED}`)
  })

  it('refuses an archive over the size ceiling before spending the bandwidth', () => {
    expect(command).toContain('-gt 1234 ]')
    expect(command).toContain(`exit ${templates.EXIT_ARCHIVE_TOO_LARGE}`)
    expect(command.indexOf('-gt 1234 ]')).toBeLessThan(command.indexOf('curl'))
  })

  it('uploads from a file so the PUT carries a Content-Length', () => {
    expect(command).toContain('--upload-file "$archive"')
  })
})

describe('commitTemplate', () => {
  it('refuses to commit with no capture paths', async () => {
    const store = createStoreDouble()
    const { ctx } = makeContext(store)
    await expect(
      templates.commitTemplate(ctx, { sandboxId: `${APP}:m1`, templateId: TEMPLATE }),
    ).rejects.toThrow(/requires capturePaths/)
    expect(store.objects.size).toBe(0)
  })

  it('uploads, verifies the object exists, then writes the manifest', async () => {
    const store = createStoreDouble()
    const { ctx, execs, started } = makeContext(store)
    // The sandbox "uploads" by way of the presigned URL; model that here.
    const original = ctx.exec
    ctx.exec = async (app, machineId, command, timeoutMs) => {
      store.seed(ARCHIVE_KEY, 'z'.repeat(4096))
      return original(app, machineId, command, timeoutMs)
    }

    const template = await templates.commitTemplate(ctx, {
      sandboxId: `${APP}:m1`,
      templateId: TEMPLATE,
      capturePaths: ['/workspace'],
      label: 'react + postgres',
    })

    expect(started).toEqual([`${APP}:m1`])
    expect(store.presigned).toContain(`PUT ${ARCHIVE_KEY}`)
    expect(execs[0]?.command).toContain('--upload-file')
    expect(template).toMatchObject({
      id: TEMPLATE,
      ref: `s3://templates/${ARCHIVE_KEY}`,
      sizeBytes: 4096,
      label: 'react + postgres',
      inUse: false,
    })
    const manifest = JSON.parse(store.objects.get(MANIFEST_KEY)?.body ?? '{}')
    expect(manifest).toMatchObject({ schema: 1, id: TEMPLATE, capturePaths: ['/workspace'] })
  })

  it('discards the archive and throws when the in-sandbox capture fails', async () => {
    const store = createStoreDouble()
    const { ctx } = makeContext(store, [{ stdout: '', stderr: 'tar: boom', exitCode: 92 }])
    store.seed(ARCHIVE_KEY, 'partial')

    await expect(
      templates.commitTemplate(ctx, {
        sandboxId: `${APP}:m1`,
        templateId: TEMPLATE,
        capturePaths: ['/workspace'],
      }),
    ).rejects.toThrow(/failed inside the sandbox \(exit 92\)/)
    expect(store.objects.has(ARCHIVE_KEY)).toBe(false)
    expect(store.objects.has(MANIFEST_KEY)).toBe(false)
  })

  it('throws when the sandbox reported success but no archive is in the store', async () => {
    const store = createStoreDouble()
    const { ctx } = makeContext(store)
    await expect(
      templates.commitTemplate(ctx, {
        sandboxId: `${APP}:m1`,
        templateId: TEMPLATE,
        capturePaths: ['/workspace'],
      }),
    ).rejects.toThrow(/no archive is in the store/)
    expect(store.objects.has(MANIFEST_KEY)).toBe(false)
  })

  it('warns, but still commits, when tar reported that files changed underneath it', async () => {
    const store = createStoreDouble()
    const { ctx } = makeContext(store, [
      { stdout: '4096', stderr: `${templates.TAR_CHANGED_MARKER}\n`, exitCode: 0 },
    ])
    const original = ctx.exec
    ctx.exec = async (app, machineId, command, timeoutMs) => {
      store.seed(ARCHIVE_KEY, 'z'.repeat(4096))
      return original(app, machineId, command, timeoutMs)
    }
    await templates.commitTemplate(ctx, {
      sandboxId: `${APP}:m1`,
      templateId: TEMPLATE,
      capturePaths: ['/workspace'],
    })
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Files changed while'),
      expect.anything(),
    )
  })
})

describe('getTemplate / listTemplates — absence is an answer, failure is not', () => {
  it('returns null for a template that genuinely is not there', async () => {
    const { ctx } = makeContext(createStoreDouble())
    expect(await templates.getTemplate(ctx, TEMPLATE)).toBeNull()
  })

  it('THROWS when the store cannot be listed, rather than reporting absence', async () => {
    const store = createStoreDouble()
    seedTemplate(store)
    store.failNext('list', new Error('store unreachable'))
    const { ctx } = makeContext(store)
    await expect(templates.getTemplate(ctx, TEMPLATE)).rejects.toThrow('store unreachable')
  })

  it('THROWS from listTemplates when the listing fails, rather than returning []', async () => {
    const store = createStoreDouble()
    store.failNext('list', new Error('store unreachable'))
    const { ctx } = makeContext(store)
    await expect(templates.listTemplates(ctx)).rejects.toThrow('store unreachable')
  })

  it('treats a manifest with no archive as absent — an interrupted capture is not a template', async () => {
    const store = createStoreDouble()
    store.seed(MANIFEST_KEY, JSON.stringify({ schema: 1, id: TEMPLATE, capturePaths: ['/w'] }))
    const { ctx } = makeContext(store)
    expect(await templates.getTemplate(ctx, TEMPLATE)).toBeNull()
    expect(await templates.listTemplates(ctx)).toEqual([])
  })

  it('lists templates and narrows by id prefix', async () => {
    const store = createStoreDouble()
    seedTemplate(store)
    store.seed(
      `${PREFIX}/other-app/manifest.json`,
      JSON.stringify({ schema: 1, id: 'other-app', capturePaths: ['/workspace'], label: 'other' }),
    )
    store.seed(`${PREFIX}/other-app/archive.tar.gz`, 'yy')
    const { ctx } = makeContext(store)

    expect((await templates.listTemplates(ctx)).map((template) => template.id).sort()).toEqual([
      'other-app',
      TEMPLATE,
    ])
    expect((await templates.listTemplates(ctx, { idPrefix: 'other' })).map((t) => t.id)).toEqual([
      'other-app',
    ])
  })

  it('ignores an unparseable manifest instead of wedging every boot behind it', async () => {
    const store = createStoreDouble()
    store.seed(MANIFEST_KEY, 'not json at all')
    store.seed(ARCHIVE_KEY, 'zz')
    const { ctx } = makeContext(store)
    expect(await templates.getTemplate(ctx, TEMPLATE)).toBeNull()
    expect(await templates.listTemplates(ctx)).toEqual([])
  })
})

describe('inUse and removeTemplate', () => {
  it('reports in use while a restore lease is live, and refuses to remove it', async () => {
    const store = createStoreDouble()
    seedTemplate(store)
    store.seed(`${PREFIX}/${TEMPLATE}/leases/m1-abc`, new Date().toISOString())
    const { ctx } = makeContext(store)

    expect((await templates.getTemplate(ctx, TEMPLATE))?.inUse).toBe(true)
    await expect(templates.removeTemplate(ctx, TEMPLATE)).rejects.toThrow(/Refusing to remove/)
    expect(store.objects.has(ARCHIVE_KEY)).toBe(true)
  })

  it('treats a lease with an unreadable timestamp as IN USE', () => {
    expect(templates.hasLiveLease([{ key: 'k', size: 0, lastModified: null }], 1000, 0)).toBe(true)
    expect(
      templates.hasLiveLease([{ key: 'k', size: 0, lastModified: 'not-a-date' }], 1000, 0),
    ).toBe(true)
  })

  it('stops counting a lease older than the transfer budget', () => {
    const old = new Date(1_000_000).toISOString()
    const now = 1_000_000 + 1000 + templates.LEASE_GRACE_MS + 1
    expect(templates.hasLiveLease([{ key: 'k', size: 0, lastModified: old }], 1000, now)).toBe(
      false,
    )
  })

  it('removes every object under the template, including an orphaned archive', async () => {
    const store = createStoreDouble()
    seedTemplate(store)
    store.seed(
      `${PREFIX}/${TEMPLATE}/leases/stale`,
      new Date(0).toISOString(),
      new Date(0).toISOString(),
    )
    const { ctx } = makeContext(store)

    await templates.removeTemplate(ctx, TEMPLATE)
    expect([...store.objects.keys()].filter((key) => key.includes(TEMPLATE))).toEqual([])
  })

  it('is a success when the template is already gone', async () => {
    const { ctx } = makeContext(createStoreDouble())
    await expect(templates.removeTemplate(ctx, TEMPLATE)).resolves.toBeUndefined()
  })

  it('never deletes on a failed lookup', async () => {
    const store = createStoreDouble()
    seedTemplate(store)
    store.failNext('list', new Error('store unreachable'))
    const { ctx } = makeContext(store)
    await expect(templates.removeTemplate(ctx, TEMPLATE)).rejects.toThrow('store unreachable')
    expect(store.objects.has(ARCHIVE_KEY)).toBe(true)
  })
})

describe('no store configured', () => {
  it('throws an actionable error naming the settings, rather than reporting no templates', async () => {
    const { ctx } = makeContext(null)
    await expect(templates.getTemplate(ctx, TEMPLATE)).rejects.toThrow(
      /No template store is configured/,
    )
    await expect(templates.listTemplates(ctx)).rejects.toThrow(/templateBucket/)
  })
})

describe('create({ templateId }) — the contract that must never fall back', () => {
  it('FAILS when the named template does not exist', async () => {
    const double = queueCreate(createFetchDouble())
    const provider = makeProvider(createStoreDouble(), double)

    await expect(provider.create({ projectId: PROJECT_ID, templateId: TEMPLATE })).rejects.toThrow(
      /it does not exist/,
    )
    // Nothing was provisioned: the template is resolved before any app, volume
    // or Machine exists.
    expect(double.matching(`POST /apps/${APP}/machines`)).toEqual([])
  })

  it('FAILS when no template store is configured at all', async () => {
    const double = queueCreate(createFetchDouble())
    const provider = makeProvider(null, double)
    await expect(provider.create({ projectId: PROJECT_ID, templateId: TEMPLATE })).rejects.toThrow(
      /No template store is configured/,
    )
    expect(double.matching(`POST /apps/${APP}/machines`)).toEqual([])
  })

  it('restores the archive into the new Machine and records the template id', async () => {
    const store = createStoreDouble()
    seedTemplate(store, ['/workspace'])
    const double = queueCreate(createFetchDouble())
    const sandbox = await makeProvider(store, double).create({
      projectId: PROJECT_ID,
      templateId: TEMPLATE,
    })

    expect(sandbox.status).toBe('running')
    const created = double.matching(`POST /apps/${APP}/machines`)[0]?.body as {
      config: { metadata: Record<string, string>; image: string }
    }
    expect(created.config.metadata['molecule-sandbox.templateId']).toBe(TEMPLATE)
    // A Fly template is a filesystem, not an image: the base image still boots.
    expect(created.config.image).toBe('registry.fly.io/molecule-sandbox:latest')

    const exec = double.matching(`POST /apps/${APP}/machines/m1/exec`)[0]?.body as {
      command: string[]
    }
    expect(exec.command[2]).toContain(`-xzf "$archive" 'workspace'`)
    expect(exec.command[2]).toContain('--no-same-owner')
    expect(store.presigned).toContain(`GET ${ARCHIVE_KEY}`)
  })

  it('extracts only what the CONTROL-PLANE manifest names, whatever else the archive holds', async () => {
    const store = createStoreDouble()
    seedTemplate(store, ['/workspace'])
    const double = queueCreate(createFetchDouble())
    await makeProvider(store, double).create({ projectId: PROJECT_ID, templateId: TEMPLATE })

    const script = (
      double.matching(`POST /apps/${APP}/machines/m1/exec`)[0]?.body as { command: string[] }
    ).command[2] as string
    expect(script).toContain(`'workspace'`)
    expect(script).not.toContain('usr/bin')
    expect(script).not.toContain('etc/')
  })

  it('DESTROYS the Machine and throws when the restore fails', async () => {
    const store = createStoreDouble()
    seedTemplate(store)
    const double = queueCreate(createFetchDouble(), { exit_code: 91, stderr: 'setuid survived' })

    await expect(
      makeProvider(store, double).create({ projectId: PROJECT_ID, templateId: TEMPLATE }),
    ).rejects.toThrow(/Restoring template "react-postgres-v3".*exit 91/s)
    expect(double.matching(`DELETE /apps/${APP}/machines/m1`).length).toBe(1)
  })

  it('releases the restore lease so the template is evictable again', async () => {
    const store = createStoreDouble()
    seedTemplate(store)
    const double = queueCreate(createFetchDouble())
    await makeProvider(store, double).create({ projectId: PROJECT_ID, templateId: TEMPLATE })

    expect([...store.objects.keys()].filter((key) => key.includes('/leases/'))).toEqual([])
  })

  it('leaves a create with no templateId untouched', async () => {
    const double = queueCreate(createFetchDouble())
    await makeProvider(createStoreDouble(), double).create({ projectId: PROJECT_ID })
    expect(double.matching(`POST /apps/${APP}/machines/m1/exec`)).toEqual([])
  })
})

describe('storage configuration', () => {
  it('reads the variables `fly storage create` exports', () => {
    process.env.BUCKET_NAME = 'mol-templates'
    process.env.AWS_ENDPOINT_URL_S3 = 'https://t3.storage.dev'
    process.env.AWS_ACCESS_KEY_ID = 'key'
    process.env.AWS_SECRET_ACCESS_KEY = 'secret'
    delete process.env.AWS_REGION

    expect(resolveTemplateStorage({})).toMatchObject({
      bucket: 'mol-templates',
      endpoint: 'https://t3.storage.dev',
      region: 'auto',
      prefix: 'molecule-sandbox-templates',
      forcePathStyle: false,
    })
  })

  it('prefers explicit config over the environment', () => {
    process.env.BUCKET_NAME = 'from-env'
    process.env.AWS_ACCESS_KEY_ID = 'key'
    process.env.AWS_SECRET_ACCESS_KEY = 'secret'
    expect(
      resolveTemplateStorage({ templateBucket: 'from-config', templatePrefix: 'tpl/' }),
    ).toMatchObject({ bucket: 'from-config', prefix: 'tpl' })
  })

  it('is unconfigured — not half-configured — when a credential is missing', () => {
    process.env.BUCKET_NAME = 'mol-templates'
    delete process.env.AWS_ACCESS_KEY_ID
    delete process.env.AWS_SECRET_ACCESS_KEY
    delete process.env.SANDBOX_TEMPLATE_ACCESS_KEY_ID
    delete process.env.SANDBOX_TEMPLATE_SECRET_ACCESS_KEY
    expect(resolveTemplateStorage({})).toBeNull()
    expect(createTemplateStore({})).toBeNull()
  })
})
