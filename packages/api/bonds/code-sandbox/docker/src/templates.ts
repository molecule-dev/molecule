/**
 * Sandbox templates on Docker — capture a sandbox's filesystem, boot new
 * sandboxes from it, share it between hosts, and reclaim it on a budget.
 *
 * ## Why the capture is not just `commit`
 *
 * `POST /commit` snapshots a container's WRITABLE LAYER, and a mounted volume is
 * not part of it. A sandbox keeps the project on a volume — that is the whole
 * point of the volume — so committing a sandbox directly produces an image that
 * builds, tags, boots, and contains no project. Everything succeeds; the template
 * is empty. So the capture copies the caller-named paths into a throwaway
 * container that has NO volume, and commits that instead.
 *
 * The paths are named by the CALLER (`capturePaths`). They are not discovered,
 * because the two answers a discovery would produce — "this sandbox has no
 * project files" and "I looked in the wrong place" — are indistinguishable, and
 * the wrong one silently ships an empty template that later boots as a working
 * sandbox with an empty workspace.
 *
 * ## The throwaway container is a tenant boundary
 *
 * It extracts a TENANT-AUTHORED archive and is then committed into a template
 * that OTHER tenants boot. So it runs with no network, no capabilities beyond the
 * three the extraction needs, a memory cap and a process cap — and setuid/setgid
 * bits are stripped after extraction, so a tenant cannot bake a privilege
 * escalation into an image somebody else boots. A previous unhardened version of
 * this step ran on the default bridge, outside every firewall rule, holding
 * Docker's full default capability set.
 *
 * @module
 */

import type {
  CommitTemplateOptions,
  ListTemplatesOptions,
  SandboxTemplate,
} from '@molecule/api-code-sandbox'

import {
  assertNoStreamError,
  type DockerDownload,
  type DockerRequest,
  type DockerUpload,
} from './request.js'

/** What the template capability needs from the provider. */
export interface TemplateContext {
  request: DockerRequest
  download: DockerDownload
  upload: DockerUpload
  /** Image the throwaway capture container runs. It only needs a shell. */
  baseImage: string
  /** Local Docker repository that holds templates. One tag per template id. */
  repository: string
  /** Remote registry host for publish/fetch, or `''` when none is configured. */
  registry: string
  /** Base64 `X-Registry-Auth` value for the remote registry. */
  registryAuth: string
  /** Label namespace for the template's own metadata labels. */
  labelPrefix: string
  warn?: (message: string, meta?: Record<string, unknown>) => void
  debug?: (message: string, meta?: Record<string, unknown>) => void
}

/**
 * Legal Docker tag component, which is also a legal container-name component.
 * A template id becomes both, so it must satisfy the stricter of the two.
 */
const VALID_TEMPLATE_ID = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,110}$/

/** Timeouts sized for operations that move gigabytes rather than metadata. */
const COMMIT_TIMEOUT_MS = 300_000
const TRANSFER_TIMEOUT_MS = 600_000
const REGISTRY_TIMEOUT_MS = 300_000

/**
 * Validate a caller-supplied template id.
 *
 * REJECTS rather than sanitizes. Sanitizing would map two distinct ids onto one
 * tag, and the second commit would silently overwrite the first — a project
 * restoring its own template and receiving somebody else's filesystem.
 *
 * @param templateId - The caller's identifier.
 * @throws {Error} When the id cannot be used as a Docker tag.
 */
export function assertTemplateId(templateId: string): void {
  if (!VALID_TEMPLATE_ID.test(templateId)) {
    throw new Error(
      `Invalid template id ${JSON.stringify(templateId.slice(0, 32))}: must match ` +
        `${String(VALID_TEMPLATE_ID)} so it can be used verbatim as a Docker tag. ` +
        'Ids are rejected rather than sanitized, because sanitizing would let two ' +
        'distinct ids collide onto one template.',
    )
  }
}

/**
 * Absolute, traversal-free path inside a sandbox. Interpolated into a `sh -c`
 * argument and into a URL query, so both shapes are checked here.
 *
 * @param path - Candidate path.
 * @throws {Error} When the path is not a safe absolute path.
 */
function assertCapturePath(path: string): void {
  if (!/^\/[^\0'"`$\\\n]*$/.test(path) || path.includes('..')) {
    throw new Error(`Invalid capture path ${JSON.stringify(path.slice(0, 64))}: must be absolute`)
  }
}

/** The provider-native reference for a template id. */
function templateRef(ctx: TemplateContext, templateId: string): string {
  return `${ctx.repository}:${templateId}`
}

/** The remote reference for a template id, in the configured registry. */
function remoteRef(ctx: TemplateContext, templateId: string): string {
  return `${ctx.registry}/${ctx.repository}:${templateId}`
}

/**
 * Require a configured shared store, naming the setting that turns it on.
 *
 * A Docker daemon can always talk to a registry, so the capability is present;
 * what is missing is the address. Throwing distinguishes that from "this
 * template is not in the shared store", which is what a `null` return would say.
 *
 * @param ctx - Template context.
 * @throws {Error} When no registry is configured.
 */
function assertRegistry(ctx: TemplateContext): void {
  if (!ctx.registry) {
    throw new Error(
      'No shared template store is configured for the Docker sandbox provider. ' +
        'Set `templateRegistry` (or SANDBOX_TEMPLATE_REGISTRY) to a Docker registry ' +
        'host to publish and fetch templates across hosts.',
    )
  }
}

/** The parent directory an archive of `path` must be extracted into. */
function parentOf(path: string): string {
  const trimmed = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path
  const index = trimmed.lastIndexOf('/')
  return index <= 0 ? '/' : trimmed.slice(0, index)
}

/**
 * Run a command in a container and fail loudly if it did not run.
 *
 * Best-effort would be wrong here: every exec in the capture path is a
 * correctness step (make the destination exist, strip setuid bits), and a
 * capture that skipped one produces a template that looks fine.
 *
 * @param ctx - Template context.
 * @param containerId - Container to run in.
 * @param command - Shell command.
 */
async function execInContainer(
  ctx: TemplateContext,
  containerId: string,
  command: string,
): Promise<void> {
  const created = (await ctx.request(`/containers/${containerId}/exec`, 'POST', {
    Cmd: ['sh', '-c', command],
    AttachStdout: true,
    AttachStderr: true,
  })) as { Id: string }
  await ctx.request(`/exec/${created.Id}/start`, 'POST', { Detach: false, Tty: false })
  const inspected = (await ctx.request(`/exec/${created.Id}/json`)) as { ExitCode: number | null }
  if (inspected?.ExitCode !== 0) {
    throw new Error(
      `Command failed inside capture container (exit ${String(inspected?.ExitCode)}): ${command}`,
    )
  }
}

/** Remove a container by id or name, tolerating one that is already gone. */
async function removeContainer(ctx: TemplateContext, ref: string): Promise<void> {
  await ctx.request(`/containers/${ref}?force=true`, 'DELETE').catch((error: unknown) => {
    ctx.debug?.('Capture container removal failed (it may already be gone)', { ref, error })
  })
}

/**
 * Every image reference currently backing a container, running or not.
 *
 * A stopped container still owns its filesystem, so it counts. The fallback on
 * failure is deliberately `null` — the caller turns that into `inUse: true`,
 * because a wrong `false` here authorizes deleting the image a live sandbox
 * boots from.
 *
 * @param ctx - Template context.
 * @returns The set of in-use image refs and ids, or `null` when it could not be read.
 */
async function inUseImageRefs(ctx: TemplateContext): Promise<Set<string> | null> {
  try {
    const containers = (await ctx.request('/containers/json?all=true')) as Array<{
      Image?: string
      ImageID?: string
    }>
    const refs = new Set<string>()
    for (const container of Array.isArray(containers) ? containers : []) {
      if (container.Image) refs.add(container.Image)
      if (container.ImageID) refs.add(container.ImageID.replace(/^sha256:/, ''))
    }
    return refs
  } catch (error) {
    ctx.warn?.('Could not list containers to determine template usage — assuming in use', { error })
    return null
  }
}

/** Whether `imageId`/`ref` appears in the in-use set. `null` means "assume yes". */
function isInUse(inUse: Set<string> | null, ref: string, imageId: string): boolean {
  if (inUse === null) return true
  if (inUse.has(ref)) return true
  const bare = imageId.replace(/^sha256:/, '')
  for (const used of inUse) {
    if (used === bare || bare.startsWith(used) || used.startsWith(bare)) return true
  }
  return false
}

/**
 * Capture a sandbox's filesystem into a reusable template.
 *
 * @param ctx - Template context.
 * @param options - What to capture and what to call it.
 * @returns The template as it now exists.
 */
export async function commitTemplate(
  ctx: TemplateContext,
  options: CommitTemplateOptions,
): Promise<SandboxTemplate> {
  assertTemplateId(options.templateId)
  const capturePaths = options.capturePaths ?? []
  for (const path of capturePaths) assertCapturePath(path)

  const ref = templateRef(ctx, options.templateId)
  const captureName = `mol-capture-${options.templateId}`

  // A previous run that died before its cleanup leaves this name taken, and the
  // create below would fail on the conflict rather than on anything real.
  await removeContainer(ctx, captureName)

  const created = (await ctx.request(`/containers/create?name=${captureName}`, 'POST', {
    Image: ctx.baseImage,
    Cmd: ['tail', '-f', '/dev/null'],
    Labels: {
      [`${ctx.labelPrefix}.template.id`]: options.templateId,
      ...(options.label ? { [`${ctx.labelPrefix}.template.label`]: options.label } : {}),
    },
    HostConfig: {
      // It is driven entirely over the Docker socket by this process. It needs
      // no network, and having one puts it outside the sandbox firewall's
      // subnet match while it handles tenant bytes.
      NetworkMode: 'none',
      AutoRemove: false,
      RestartPolicy: { Name: '' },
      CapDrop: ['ALL'],
      CapAdd: ['CHOWN', 'SETGID', 'SETUID'],
      SecurityOpt: ['no-new-privileges'],
      Memory: 2 * 1024 * 1024 * 1024,
      MemorySwap: 2 * 1024 * 1024 * 1024,
      PidsLimit: 256,
    },
  })) as { Id: string }

  try {
    await ctx.request(`/containers/${created.Id}/start`, 'POST')

    for (const path of capturePaths) {
      const parent = parentOf(path)
      await execInContainer(ctx, created.Id, `mkdir -p '${parent}'`)
      // Streamed straight through: a project tree is gigabytes, and buffering it
      // in this process would trade a slow capture for a dead API.
      const archive = await ctx.download(
        `/containers/${options.sandboxId}/archive?path=${encodeURIComponent(path)}`,
        TRANSFER_TIMEOUT_MS,
      )
      await ctx.upload(
        `/containers/${created.Id}/archive?path=${encodeURIComponent(parent)}`,
        archive,
        TRANSFER_TIMEOUT_MS,
      )
      // Strip setuid/setgid from the extracted tree. Docker's archive extraction
      // honors the mode bits in the archive, and the archive came from a
      // container the tenant controls — so without this a tenant can plant a
      // setuid-root binary in an image OTHER tenants boot. Scoped by `-perm` so
      // it touches only the handful of files that have those bits, not the whole
      // tree.
      await execInContainer(
        ctx,
        created.Id,
        `find '${path}' -type f -perm /6000 -exec chmod a-s {} + 2>/dev/null; exit 0`,
      )
    }

    const params = new URLSearchParams({
      container: created.Id,
      repo: ctx.repository,
      tag: options.templateId,
      pause: 'false',
    })
    if (options.label) params.set('comment', options.label)
    await ctx.request(`/commit?${params.toString()}`, 'POST', undefined, COMMIT_TIMEOUT_MS)
  } finally {
    await removeContainer(ctx, created.Id)
  }

  const template = await getTemplate(ctx, options.templateId)
  if (!template) {
    throw new Error(
      `Template "${options.templateId}" was committed as ${ref} but cannot be read back`,
    )
  }
  return template
}

/**
 * Read one template by the caller's identifier.
 *
 * @param ctx - Template context.
 * @param templateId - The caller's identifier.
 * @returns The template, or `null` when no image carries that tag.
 */
export async function getTemplate(
  ctx: TemplateContext,
  templateId: string,
): Promise<SandboxTemplate | null> {
  assertTemplateId(templateId)
  const ref = templateRef(ctx, templateId)

  let image: {
    Id: string
    Created?: string
    Size?: number
    Config?: { Labels?: Record<string, string> }
  }
  try {
    image = (await ctx.request(`/images/${encodeURIComponent(ref)}/json`)) as typeof image
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // A 404 is the answer "no such template". Anything else is a failure to
    // look, and reporting it as absence would turn a transient daemon hiccup
    // into a full cold rebuild on every boot.
    if (/\b404\b|no such image/i.test(message)) return null
    throw error
  }

  const inUse = await inUseImageRefs(ctx)
  const labels = image.Config?.Labels ?? {}
  return {
    id: labels[`${ctx.labelPrefix}.template.id`] ?? templateId,
    ref,
    createdAt: image.Created ?? '',
    sizeBytes: typeof image.Size === 'number' ? image.Size : null,
    ...(labels[`${ctx.labelPrefix}.template.label`]
      ? { label: labels[`${ctx.labelPrefix}.template.label`] }
      : {}),
    inUse: isInUse(inUse, ref, image.Id ?? ''),
  }
}

/**
 * Enumerate templates so the caller can apply its retention policy.
 *
 * @param ctx - Template context.
 * @param options - Narrowing by id prefix.
 * @returns Every matching template.
 */
export async function listTemplates(
  ctx: TemplateContext,
  options?: ListTemplatesOptions,
): Promise<SandboxTemplate[]> {
  const filters = encodeURIComponent(JSON.stringify({ reference: [`${ctx.repository}:*`] }))
  // No try/catch: a failed listing must reach the caller. Returning `[]` would
  // tell a caller whose next step is deletion that nothing is over budget, and
  // it would believe it.
  const images = (await ctx.request(`/images/json?filters=${filters}`)) as Array<{
    Id: string
    RepoTags?: string[] | null
    Created?: number
    Size?: number
    Labels?: Record<string, string> | null
  }>
  const inUse = await inUseImageRefs(ctx)

  const templates: SandboxTemplate[] = []
  for (const image of Array.isArray(images) ? images : []) {
    for (const tag of image.RepoTags ?? []) {
      if (!tag.startsWith(`${ctx.repository}:`)) continue
      const labels = image.Labels ?? {}
      const id = labels[`${ctx.labelPrefix}.template.id`] ?? tag.slice(ctx.repository.length + 1)
      if (options?.idPrefix && !id.startsWith(options.idPrefix)) continue
      templates.push({
        id,
        ref: tag,
        createdAt:
          typeof image.Created === 'number' ? new Date(image.Created * 1000).toISOString() : '',
        sizeBytes: typeof image.Size === 'number' ? image.Size : null,
        ...(labels[`${ctx.labelPrefix}.template.label`]
          ? { label: labels[`${ctx.labelPrefix}.template.label`] }
          : {}),
        inUse: isInUse(inUse, tag, image.Id ?? ''),
      })
    }
  }
  return templates
}

/**
 * Delete a template, refusing while anything still boots from it.
 *
 * @param ctx - Template context.
 * @param templateId - The caller's identifier.
 */
export async function removeTemplate(ctx: TemplateContext, templateId: string): Promise<void> {
  const template = await getTemplate(ctx, templateId)
  // Already gone is a success — callers reconcile, and reconciliation re-runs.
  if (!template) return
  if (template.inUse) {
    throw new Error(
      `Refusing to remove template "${templateId}" (${template.ref}): a sandbox is still ` +
        'backed by it, and removing it would destroy that sandbox.',
    )
  }
  // Deliberately no `force`: the daemon independently refuses to remove an image
  // a container references, which is a second net behind the check above for the
  // sandbox that was created in between.
  await ctx.request(`/images/${encodeURIComponent(template.ref)}`, 'DELETE')
}

/**
 * Copy a local template into the configured registry.
 *
 * @param ctx - Template context.
 * @param templateId - The caller's identifier.
 */
export async function publishTemplate(ctx: TemplateContext, templateId: string): Promise<void> {
  assertRegistry(ctx)
  const template = await getTemplate(ctx, templateId)
  if (!template)
    throw new Error(`Cannot publish template "${templateId}": it does not exist locally`)

  await ctx.request(
    `/images/${encodeURIComponent(template.ref)}/tag?repo=${encodeURIComponent(
      `${ctx.registry}/${ctx.repository}`,
    )}&tag=${encodeURIComponent(templateId)}`,
    'POST',
  )
  const pushed = await ctx.request(
    `/images/${encodeURIComponent(`${ctx.registry}/${ctx.repository}`)}/push?tag=${encodeURIComponent(templateId)}`,
    'POST',
    undefined,
    REGISTRY_TIMEOUT_MS,
    { 'X-Registry-Auth': ctx.registryAuth },
  )
  assertNoStreamError(pushed, `push of ${remoteRef(ctx, templateId)}`)
}

/**
 * Pull a template from the configured registry onto this host.
 *
 * @param ctx - Template context.
 * @param templateId - The caller's identifier.
 * @returns The now-local template, or `null` when the registry does not have it.
 */
export async function fetchTemplate(
  ctx: TemplateContext,
  templateId: string,
): Promise<SandboxTemplate | null> {
  assertRegistry(ctx)
  const remote = `${ctx.registry}/${ctx.repository}`

  try {
    const pulled = await ctx.request(
      `/images/create?fromImage=${encodeURIComponent(remote)}&tag=${encodeURIComponent(templateId)}`,
      'POST',
      undefined,
      REGISTRY_TIMEOUT_MS,
      { 'X-Registry-Auth': ctx.registryAuth },
    )
    assertNoStreamError(pulled, `pull of ${remoteRef(ctx, templateId)}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // "The registry does not have it" is an answer, and the caller's next move is
    // to build the template. Anything else is a failure to look, and must not be
    // reported as absence.
    if (/manifest unknown|not found|\b404\b/i.test(message)) return null
    throw error
  }

  await ctx.request(
    `/images/${encodeURIComponent(`${remote}:${templateId}`)}/tag?repo=${encodeURIComponent(
      ctx.repository,
    )}&tag=${encodeURIComponent(templateId)}`,
    'POST',
  )
  return getTemplate(ctx, templateId)
}
