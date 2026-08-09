/**
 * Warm-start templates on Fly — capture a prepared sandbox filesystem once, and
 * restore it into every later sandbox that wants the same configuration.
 *
 * ## Why a tar in object storage, and not something Fly-native
 *
 * The Docker bond's template is `docker commit`. Fly has no equivalent, and the
 * two Fly-native mechanisms that look like one do not survive contact with this
 * bond's isolation model:
 *
 * - **An OCI image.** Fly PULLS images from a registry; nothing in the Machines
 *   API produces an image from a running Machine. Building one would need the
 *   Machine's bytes in hand, which is the very thing that is hard here.
 * - **A volume snapshot.** Fly can snapshot a volume and create a new volume from
 *   it (`POST /v1/apps/{app}/volumes` takes `snapshot_id` "restore from snapshot"
 *   and `source_volume_id` "fork from remote volume" —
 *   https://docs.machines.dev/openapi.json). But a warm-start template exists to
 *   be shared by every project with the same dependency set, and Fly documents
 *   that "Every Fly Volume belongs to a Fly App and you can't share a volume
 *   between apps" (https://fly.io/docs/volumes/overview/). This bond puts each
 *   project in its OWN app precisely for tenant isolation, so a snapshot taken in
 *   one project's app can never become another project's volume. Volume snapshots
 *   could serve a per-project restore point and nothing else, and the core
 *   deliberately has ONE template primitive rather than two — a provider that
 *   implemented only the per-project half would satisfy the type and silently
 *   fail the case the capability exists for.
 *
 * What is left is the boring one: `tar` the prepared paths into an S3-compatible
 * object store and untar them into the new sandbox. The Machines API has no file
 * transfer endpoint (`exec` is the entire surface), and pushing hundreds of
 * megabytes through `exec`'s JSON response is not a slower version of a transfer,
 * it is a different order of magnitude — so the bytes move DIRECTLY between the
 * sandbox and the store over presigned URLs. The control plane only ever handles
 * the URL, the manifest and the metadata.
 *
 * ## What the base image already gives you, and what this adds
 *
 * The base image (`registry.fly.io/molecule-sandbox:latest`) already carries the
 * toolchain, a warmed npm cache, AND the package superset on the rootfs, so this
 * is NOT about installing anything. It is about the per-configuration layer —
 * the scaffolded SOURCE — which otherwise gets regenerated on every single boot.
 * `node_modules` is deliberately excluded from capture (see the capture command)
 * because the image provides it.
 *
 * ## The tenant boundary is the RESTORE, not the capture
 *
 * A capture runs inside a sandbox the tenant controls, so nothing done there is a
 * security control: a tenant can replace `tar` and emit any archive it likes. The
 * boundary is the restore, which runs in a fresh Machine before anyone gets a
 * handle to it. Four independent properties are enforced there, each verified
 * against GNU tar 1.35 rather than assumed:
 *
 * 1. **Only the manifest's `capturePaths` are extracted.** They are passed to
 *    `tar` as member selectors, and the manifest is written by the CONTROL PLANE,
 *    never by the sandbox. An archive that also contains `usr/bin/node` does not
 *    get it extracted.
 * 2. **`..` and absolute members cannot escape.** GNU tar strips a leading `/`
 *    and refuses a member containing `..` ("Member name contains '..'") with a
 *    non-zero exit, which fails the restore.
 * 3. **A symlink cannot be used to write outside the tree.** GNU tar refuses to
 *    follow a symlink member when extracting through it, and exits non-zero.
 * 4. **setuid/setgid never survives, and that is ASSERTED.** Extraction uses
 *    `--no-same-owner --no-same-permissions`, a `find -perm /6000 -exec chmod a-s`
 *    sweep follows, and then a second `find` re-checks: any remaining setuid or
 *    setgid file FAILS the restore. A failed restore destroys the Machine rather
 *    than handing back a sandbox that looks healthy.
 *
 * What that does NOT cover, stated plainly: the presigned `PUT` handed to a
 * capturing sandbox stays valid until it expires, so a hostile tenant can
 * re-upload different bytes after the control plane has verified the object, and
 * the manifest's `sizeBytes` would then be stale. It gains that tenant nothing it
 * did not already have — it authored the archive in the first place — which is
 * exactly why the boundary is on the restore side rather than on the contents.
 * Shorten `templateUrlExpirySeconds` if a stale size would matter to you.
 *
 * ## What the sandbox image must contain
 *
 * The capture and restore run as shell commands inside the Machine, so the image
 * needs `tar` (GNU: the `..`/symlink refusals and `--no-same-permissions` above
 * are GNU tar behaviours), `gzip`, GNU `find` (for `-perm /6000`), `mktemp` that
 * accepts a suffix after the `X`s, and `curl` new enough for `--fail-with-body`
 * (7.76+). The stock `molecule-sandbox` image is Debian-based and has all of
 * them; a custom `baseImage` built on BusyBox does not, and the failure surfaces
 * as a capture that exits non-zero rather than as a wrong template.
 *
 * @module
 */

import type {
  CommitTemplateOptions,
  ExecResult,
  ListTemplatesOptions,
  SandboxTemplate,
} from '@molecule/api-code-sandbox'
import { t } from '@molecule/api-i18n'

import type { ObjectStore, StoredObject } from './storage.js'
import { shellQuote } from './utilities.js'

/**
 * Legal template id. REJECTED rather than sanitized, and deliberately the same
 * shape the Docker bond accepts, so a caller's ids work on either provider.
 * Sanitizing would map two distinct ids onto one key, and the second commit
 * would silently overwrite the first — a project restoring its own template and
 * receiving somebody else's filesystem.
 */
const VALID_TEMPLATE_ID = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,110}$/

/** Object name holding the control-plane-written record of a template. */
const MANIFEST_OBJECT = 'manifest.json'

/** Object name holding the captured tar archive. */
const ARCHIVE_OBJECT = 'archive.tar.gz'

/** Key segment under a template holding in-flight restore leases. */
const LEASES_SEGMENT = 'leases'

/** Manifest schema version, so a future change can be detected rather than mis-parsed. */
const MANIFEST_SCHEMA = 1

/**
 * Single-`PUT` ceiling: "With a single `PUT` operation, you can upload a single
 * object up to 5 GB in size"
 * (https://docs.aws.amazon.com/AmazonS3/latest/userguide/upload-objects.html).
 * The sandbox uploads with one presigned PUT, so an archive above this cannot be
 * stored and the capture refuses before spending the bandwidth.
 */
export const MAX_ARCHIVE_BYTES = 5 * 1024 * 1024 * 1024

/** Default wall-clock budget for a capture or restore transfer, in ms. */
export const DEFAULT_TRANSFER_TIMEOUT_MS = 900_000

/** Default lifetime of a presigned capture/restore URL, in seconds. */
export const DEFAULT_PRESIGN_EXPIRY_SECONDS = 3600

/**
 * Extra time a restore lease counts as live beyond the transfer budget, covering
 * the Machine boot and the API round trips that bracket the transfer itself.
 * A lease older than `transferTimeoutMs + this` cannot belong to a live restore,
 * because the restore's own exec is bounded by that budget.
 */
export const LEASE_GRACE_MS = 120_000

/** Exit status the capture script uses when the archive is over the size ceiling. */
export const EXIT_ARCHIVE_TOO_LARGE = 90

/** Exit status the restore script uses when a setuid/setgid file survived the sweep. */
export const EXIT_SETUID_SURVIVED = 91

/** Exit status the capture script uses when `tar` failed outright (as opposed to warning). */
export const EXIT_TAR_FAILED = 92

/** Marker the capture script prints on stderr when `tar` reported changed files. */
export const TAR_CHANGED_MARKER = 'MOL_TAR_FILES_CHANGED'

/** The control-plane-written record of a template. Its existence defines the template's existence. */
export interface TemplateManifest {
  /** Schema version of this record. */
  schema: number
  /** The caller's template id. */
  id: string
  /**
   * Absolute paths captured, exactly as the caller named them.
   *
   * This is the security-relevant field: on restore these become `tar`'s member
   * selectors, so the extraction surface is control-plane policy rather than
   * anything the captured sandbox could influence.
   */
  capturePaths: string[]
  /** When the capture completed, ISO 8601. */
  createdAt: string
  /** Archive size in bytes as observed in the store at capture time. */
  sizeBytes: number
  /** Free-form label recorded at capture time. */
  label?: string
}

/** What the template capability needs from the provider. */
export interface TemplateContext {
  /** The configured object store, or `null` when the operator has not configured one. */
  store: ObjectStore | null
  /** Runs a shell command inside a Machine and returns its result. */
  exec(app: string, machineId: string, command: string, timeoutMs: number): Promise<ExecResult>
  /** Blocks until a Machine is running, so it can be exec'd into. */
  ensureStarted(app: string, machineId: string): Promise<void>
  /** Splits a composite sandbox id into its app and Machine id. */
  parseSandboxId(id: string): { app: string; machineId: string }
  /** Lifetime of a presigned capture/restore URL, in seconds. */
  presignExpirySeconds: number
  /** Wall-clock budget for a capture or restore transfer, in ms. */
  transferTimeoutMs: number
  /** Largest archive this provider will store, in bytes. */
  maxArchiveBytes: number
  warn?: (message: string, meta?: Record<string, unknown>) => void
  debug?: (message: string, meta?: Record<string, unknown>) => void
}

/**
 * Validate a caller-supplied template id.
 * @param templateId - The caller's identifier.
 * @throws {Error} When the id cannot be used verbatim as an object-key segment.
 */
export function assertTemplateId(templateId: string): void {
  if (!VALID_TEMPLATE_ID.test(templateId)) {
    throw new Error(
      t(
        'codeSandbox.flyio.error.badTemplateId',
        { templateId: templateId.slice(0, 32) },
        {
          defaultValue:
            `Invalid template id ${JSON.stringify(templateId.slice(0, 32))}: must match ` +
            `${String(VALID_TEMPLATE_ID)} so it can be used verbatim as an object-storage key ` +
            'segment. Ids are rejected rather than sanitized, because sanitizing would let two ' +
            'distinct ids collide onto one template.',
        },
      ),
    )
  }
}

/**
 * Validate a path that will be interpolated into a `sh -c` command AND used as a
 * `tar` member selector.
 * @param path - Candidate absolute path inside the sandbox.
 * @throws {Error} When the path is not a plain, absolute, traversal-free path.
 */
export function assertCapturePath(path: string): void {
  if (
    !path.startsWith('/') ||
    path.includes('..') ||
    // Wildcards would make `tar`'s member selection match more than the caller
    // named, which is the one thing the restore's containment rests on.
    /[\0\n\r*?[\]]/.test(path)
  ) {
    throw new Error(
      t(
        'codeSandbox.flyio.error.badCapturePath',
        { path: path.slice(0, 64) },
        {
          defaultValue:
            `Invalid capture path ${JSON.stringify(path.slice(0, 64))}: must be an absolute path ` +
            'with no ".." segment and no glob characters.',
        },
      ),
    )
  }
}

/**
 * Converts an absolute capture path into the relative member name used in the
 * archive, so an archive of `/workspace` holds `workspace/…` and extracts with
 * `tar -C /`.
 * @param path - Absolute capture path.
 * @returns The path with its leading and trailing slashes removed.
 */
export function archiveMember(path: string): string {
  return path.replace(/^\/+/, '').replace(/\/+$/, '')
}

/** The store prefix holding everything about one template. */
function templatePrefix(store: ObjectStore, templateId: string): string {
  return `${store.prefix}/${templateId}`
}

/** Key of a template's manifest object. */
export function manifestKey(store: ObjectStore, templateId: string): string {
  return `${templatePrefix(store, templateId)}/${MANIFEST_OBJECT}`
}

/** Key of a template's archive object. */
export function archiveKey(store: ObjectStore, templateId: string): string {
  return `${templatePrefix(store, templateId)}/${ARCHIVE_OBJECT}`
}

/** Key of one in-flight restore lease. */
export function leaseKey(store: ObjectStore, templateId: string, leaseId: string): string {
  return `${templatePrefix(store, templateId)}/${LEASES_SEGMENT}/${leaseId}`
}

/**
 * The provider-native reference for a template. OPAQUE to callers.
 * @param store - The configured object store.
 * @param templateId - The caller's identifier.
 * @returns An `s3://bucket/key` reference to the archive.
 */
export function templateRef(store: ObjectStore, templateId: string): string {
  return `s3://${store.bucket}/${archiveKey(store, templateId)}`
}

/**
 * Require a configured object store, naming the settings that turn it on.
 *
 * Thrown rather than reported as "no such template": the capability is present —
 * Fly plus any S3-compatible endpoint — and only the address is missing, so an
 * operator needs to see the configuration error rather than watch every boot
 * quietly rebuild from scratch.
 * @param ctx - Template context.
 * @returns The configured store.
 * @throws {Error} When no store is configured.
 */
export function requireStore(ctx: TemplateContext): ObjectStore {
  if (!ctx.store) {
    throw new Error(
      t('codeSandbox.flyio.error.noTemplateStore', undefined, {
        defaultValue:
          'No template store is configured for the Fly.io sandbox provider. Fly cannot commit a ' +
          'running Machine to an image, so templates are tar archives in S3-compatible object ' +
          'storage: set templateBucket/templateAccessKeyId/templateSecretAccessKey (or ' +
          'BUCKET_NAME/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY, which `fly storage create` sets) ' +
          'plus templateEndpoint (AWS_ENDPOINT_URL_S3) for a non-AWS endpoint such as Tigris.',
      }),
    )
  }
  return ctx.store
}

/**
 * Builds the in-sandbox capture command: archive the named paths, refuse an
 * oversized result, and upload it to a presigned URL.
 *
 * The archive is written to a file BEFORE the upload rather than piped into
 * `curl`, for two reasons that both bite: a pipeline reports only the last
 * command's status, so a failed `tar` would upload a truncated archive and
 * report success; and an upload from a pipe has no `Content-Length`, so `curl`
 * sends `Transfer-Encoding: chunked`, which S3 rejects on a presigned `PUT`.
 * @param paths - Absolute capture paths, already validated.
 * @param url - Presigned `PUT` URL for the archive object.
 * @param maxBytes - Largest archive that may be uploaded.
 * @returns A `sh` script.
 */
export function buildCaptureCommand(paths: string[], url: string, maxBytes: number): string {
  const members = paths.map((path) => shellQuote(archiveMember(path))).join(' ')
  return [
    'set -e',
    'archive=$(mktemp /tmp/mol-template-capture-XXXXXX.tar.gz)',
    // Masked on the way OUT as well as on the way in: `--owner=0 --group=0
    // --numeric-owner` keeps the capturing sandbox's uids out of the archive,
    // and `--mode='a-s'` records every member without setuid/setgid. Neither is
    // a security control on its own — a tenant controls this sandbox and can
    // emit any archive it likes — but they mean a template captured from an
    // honest sandbox never even contains the bits, and the restore's own mask
    // and post-extraction assertion are what actually enforce it.
    // node_modules is EXCLUDED by design: the sandbox image bakes the package
    // superset on the rootfs (with /workspace/node_modules resolving into it),
    // so a template only needs the per-configuration layer — the scaffolded
    // source — and a template restored onto any machine finds its packages
    // already provided by the image. Capturing node_modules would multiply the
    // archive by the whole superset (~GBs) and routinely trip maxArchiveBytes.
    `tar -C / --numeric-owner --owner=0 --group=0 --mode='a-s' --exclude='node_modules' -czf "$archive" ${members} || tar_rc=$?`,
    // GNU tar exits 1 for "some files differ" — the normal outcome of archiving
    // a live workspace whose dev server is still writing. That is tolerated and
    // reported; 2 and above are real failures.
    `if [ "\${tar_rc:-0}" -eq 1 ]; then echo ${shellQuote(TAR_CHANGED_MARKER)} >&2; fi`,
    `if [ "\${tar_rc:-0}" -gt 1 ]; then rm -f "$archive"; exit ${EXIT_TAR_FAILED}; fi`,
    'bytes=$(wc -c < "$archive")',
    `if [ "$bytes" -gt ${maxBytes} ]; then rm -f "$archive"; echo "archive is $bytes bytes, over the ${maxBytes} byte limit" >&2; exit ${EXIT_ARCHIVE_TOO_LARGE}; fi`,
    `curl --fail-with-body -sS --retry 3 --retry-connrefused --upload-file "$archive" ${shellQuote(url)}`,
    'rm -f "$archive"',
    'printf %s "$bytes"',
  ].join('\n')
}

/**
 * Builds the in-sandbox restore command: download the archive, extract ONLY the
 * manifest's paths, and prove no setuid/setgid file survived.
 *
 * See the module docs for why each flag is here. The download is to a file
 * rather than piped into `tar` so a failed download cannot be reported as a
 * successful extraction of a truncated stream.
 * @param paths - Absolute capture paths from the CONTROL-PLANE manifest.
 * @param url - Presigned `GET` URL for the archive object.
 * @returns A `sh` script.
 */
export function buildRestoreCommand(paths: string[], url: string): string {
  const members = paths.map((path) => shellQuote(archiveMember(path))).join(' ')
  const roots = paths.map((path) => shellQuote(path)).join(' ')
  return [
    'set -e',
    'umask 022',
    'archive=$(mktemp /tmp/mol-template-restore-XXXXXX.tar.gz)',
    `curl --fail-with-body -sS --retry 3 --retry-connrefused -o "$archive" ${shellQuote(url)}`,
    // Member selection is what contains a hostile archive: anything the archive
    // holds outside these paths is never written. `--no-same-owner` keeps the
    // capturing tenant's uids out; `--no-same-permissions` applies the umask,
    // which drops setuid/setgid. A member named `..`, an absolute member, or a
    // write through a symlink all make GNU tar exit non-zero, which `set -e`
    // turns into a failed restore.
    `tar -C / --no-same-owner --no-same-permissions -xzf "$archive" ${members}`,
    'rm -f "$archive"',
    // Independent of whatever the extractor's mode handling did: strip the bits,
    // then PROVE none remain. A tenant must not be able to plant a setuid binary
    // in a filesystem another tenant boots. `-xdev` keeps the sweep — and the
    // assertion that follows it — inside the restored filesystem, so a capture
    // rooted absurdly high cannot fail the restore on the image's OWN legitimate
    // setuid binaries on a different mount.
    `find ${roots} -xdev -type f -perm /6000 -exec chmod a-s {} + 2>/dev/null || true`,
    `leftover=$(find ${roots} -xdev -type f -perm /6000 -print 2>/dev/null | head -n 1 || true)`,
    `if [ -n "$leftover" ]; then echo "setuid/setgid survived restore: $leftover" >&2; exit ${EXIT_SETUID_SURVIVED}; fi`,
  ].join('\n')
}

/** Groups a flat object listing by template id. */
interface TemplateObjects {
  manifest?: StoredObject
  archive?: StoredObject
  leases: StoredObject[]
}

/**
 * Buckets a listing of the template prefix by template id.
 * @param store - The configured object store.
 * @param objects - Objects listed under the store prefix.
 * @returns One entry per template id seen.
 */
function groupByTemplate(
  store: ObjectStore,
  objects: StoredObject[],
): Map<string, TemplateObjects> {
  const grouped = new Map<string, TemplateObjects>()
  for (const object of objects) {
    if (!object.key.startsWith(`${store.prefix}/`)) continue
    const rest = object.key.slice(store.prefix.length + 1)
    const slash = rest.indexOf('/')
    if (slash <= 0) continue
    const id = rest.slice(0, slash)
    const tail = rest.slice(slash + 1)
    const entry = grouped.get(id) ?? { leases: [] }
    if (tail === MANIFEST_OBJECT) entry.manifest = object
    else if (tail === ARCHIVE_OBJECT) entry.archive = object
    else if (tail.startsWith(`${LEASES_SEGMENT}/`)) entry.leases.push(object)
    grouped.set(id, entry)
  }
  return grouped
}

/**
 * How long a restore lease can possibly correspond to a live restore.
 * @param ctx - Template context.
 * @returns The lease TTL in ms.
 */
function leaseTtlMs(ctx: TemplateContext): number {
  return ctx.transferTimeoutMs + LEASE_GRACE_MS
}

/**
 * Decides whether any lease means a restore is still in flight.
 *
 * A lease with no readable timestamp counts as LIVE. That is the whole rule the
 * core states for this field: an unreadable answer resolves to in-use, never to
 * free.
 * @param leases - Lease objects for one template.
 * @param ttlMs - How long a lease can possibly correspond to a live restore.
 * @param now - Current time in ms since the epoch.
 * @returns `true` when at least one lease is live.
 */
export function hasLiveLease(leases: StoredObject[], ttlMs: number, now: number): boolean {
  return leases.some((lease) => {
    if (!lease.lastModified) return true
    const at = Date.parse(lease.lastModified)
    if (!Number.isFinite(at)) return true
    return now - at < ttlMs
  })
}

/**
 * Parses a manifest body, returning `null` when it is not one of ours.
 * @param body - Raw manifest text.
 * @param templateId - The template the manifest was read for.
 * @param ctx - Template context, for logging.
 * @returns The manifest, or `null` when it cannot be used.
 */
function parseManifest(
  body: string,
  templateId: string,
  ctx: TemplateContext,
): TemplateManifest | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch (error) {
    // The manifest is written only by this provider, so an unparseable one is a
    // corrupt template rather than a failed read. Reporting it as absent lets
    // the next commit overwrite it; reporting it as an error would wedge every
    // boot of that configuration behind an operator.
    ctx.warn?.(
      'Fly sandbox template manifest is not valid JSON — treating the template as absent',
      {
        templateId,
        error,
      },
    )
    return null
  }
  const manifest = parsed as Partial<TemplateManifest>
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    manifest.schema !== MANIFEST_SCHEMA ||
    !Array.isArray(manifest.capturePaths) ||
    manifest.capturePaths.length === 0
  ) {
    ctx.warn?.('Fly sandbox template manifest is unusable — treating the template as absent', {
      templateId,
      schema: manifest?.schema,
    })
    return null
  }
  return {
    schema: MANIFEST_SCHEMA,
    id: typeof manifest.id === 'string' ? manifest.id : templateId,
    capturePaths: manifest.capturePaths,
    createdAt: typeof manifest.createdAt === 'string' ? manifest.createdAt : '',
    sizeBytes: typeof manifest.sizeBytes === 'number' ? manifest.sizeBytes : 0,
    ...(typeof manifest.label === 'string' ? { label: manifest.label } : {}),
  }
}

/** Builds the public `SandboxTemplate` from a manifest and the objects behind it. */
function toTemplate(
  store: ObjectStore,
  manifest: TemplateManifest,
  objects: TemplateObjects,
  inUse: boolean,
): SandboxTemplate {
  return {
    id: manifest.id,
    ref: templateRef(store, manifest.id),
    createdAt: manifest.createdAt || (objects.archive?.lastModified ?? ''),
    sizeBytes: objects.archive ? objects.archive.size : null,
    ...(manifest.label ? { label: manifest.label } : {}),
    inUse,
  }
}

/**
 * Read one template, and the manifest behind it, by the caller's identifier.
 *
 * Separate from {@link getTemplate} because the restore path needs the
 * manifest's `capturePaths` — the extraction surface — and the public shape does
 * not carry them.
 * @param ctx - Template context.
 * @param templateId - The caller's identifier.
 * @returns The template and its manifest, or `null` when no usable template exists.
 */
export async function readTemplate(
  ctx: TemplateContext,
  templateId: string,
): Promise<{ template: SandboxTemplate; manifest: TemplateManifest } | null> {
  assertTemplateId(templateId)
  const store = requireStore(ctx)

  // No try/catch: a failed lookup must reach the caller. Reporting it as absence
  // would turn a transient store failure into a full cold rebuild on every boot,
  // and — on the eviction path — into "nothing is in use".
  const objects = groupByTemplate(store, await store.list(`${templatePrefix(store, templateId)}/`))
  const entry = objects.get(templateId)
  if (!entry?.manifest) return null

  const body = await store.getText(manifestKey(store, templateId))
  // Raced against a concurrent removal: the listing saw it, the read did not.
  if (body === null) return null
  const manifest = parseManifest(body, templateId, ctx)
  if (!manifest) return null

  if (!entry.archive) {
    // A manifest with no archive is an interrupted capture, not a template. It
    // is reported as absent so the caller rebuilds; `removeTemplate` sweeps the
    // whole prefix, so the orphan is still reclaimable.
    ctx.warn?.('Fly sandbox template has a manifest but no archive — treating it as absent', {
      templateId,
    })
    return null
  }

  const inUse = hasLiveLease(entry.leases, leaseTtlMs(ctx), Date.now())
  return { template: toTemplate(store, manifest, entry, inUse), manifest }
}

/**
 * Read one template by the caller's identifier.
 * @param ctx - Template context.
 * @param templateId - The caller's identifier.
 * @returns The template, or `null` when no template has that id.
 */
export async function getTemplate(
  ctx: TemplateContext,
  templateId: string,
): Promise<SandboxTemplate | null> {
  return (await readTemplate(ctx, templateId))?.template ?? null
}

/**
 * Enumerate templates so the caller can apply its retention policy.
 * @param ctx - Template context.
 * @param options - Narrowing by id prefix.
 * @returns Every matching template.
 */
export async function listTemplates(
  ctx: TemplateContext,
  options?: ListTemplatesOptions,
): Promise<SandboxTemplate[]> {
  const store = requireStore(ctx)
  // Deliberately uncaught. A caller enumerating templates is about to delete
  // some, and `[]` from a failed listing tells it nothing is orphaned.
  const grouped = groupByTemplate(store, await store.list(`${store.prefix}/`))
  const now = Date.now()

  const templates: SandboxTemplate[] = []
  for (const [id, entry] of grouped) {
    if (options?.idPrefix && !id.startsWith(options.idPrefix)) continue
    if (!entry.manifest || !entry.archive) continue
    if (!VALID_TEMPLATE_ID.test(id)) {
      ctx.warn?.('Ignoring an object-store key that is not a valid Fly sandbox template id', { id })
      continue
    }
    const body = await store.getText(manifestKey(store, id))
    if (body === null) continue
    const manifest = parseManifest(body, id, ctx)
    if (!manifest) continue
    templates.push(
      toTemplate(store, manifest, entry, hasLiveLease(entry.leases, leaseTtlMs(ctx), now)),
    )
  }
  return templates
}

/**
 * Capture a sandbox's filesystem into a reusable template.
 * @param ctx - Template context.
 * @param options - What to capture and what to call it.
 * @returns The template as it now exists.
 * @throws {Error} When no store is configured, no capture paths were given, the
 *   in-sandbox capture failed, or the archive cannot be read back.
 */
export async function commitTemplate(
  ctx: TemplateContext,
  options: CommitTemplateOptions,
): Promise<SandboxTemplate> {
  assertTemplateId(options.templateId)
  const store = requireStore(ctx)

  const capturePaths = options.capturePaths ?? []
  if (capturePaths.length === 0) {
    // On Docker a template is the container's own image plus the capture paths,
    // so an empty list still yields a usable filesystem. Here the archive IS the
    // template, so an empty list would produce a template that boots into an
    // empty workspace and looks completely healthy.
    throw new Error(
      t('codeSandbox.flyio.error.noCapturePaths', undefined, {
        defaultValue:
          'commitTemplate on Fly requires capturePaths: the template IS the archive of those ' +
          'paths, so committing none would store an empty template that later boots successfully ' +
          'into an empty workspace. Pass the project root, e.g. ["/workspace"].',
      }),
    )
  }
  for (const path of capturePaths) assertCapturePath(path)

  const { app, machineId } = ctx.parseSandboxId(options.sandboxId)
  // The capture runs THROUGH the Machine, so it has to be running. A suspended
  // or stopped sandbox is started rather than failed — the caller asked for its
  // filesystem, not for its process tree.
  await ctx.ensureStarted(app, machineId)

  const key = archiveKey(store, options.templateId)
  const url = await store.presignPut(key, ctx.presignExpirySeconds)

  let result: ExecResult
  try {
    result = await ctx.exec(
      app,
      machineId,
      buildCaptureCommand(capturePaths, url, ctx.maxArchiveBytes),
      ctx.transferTimeoutMs,
    )
  } catch (error) {
    await discard(ctx, store, [key])
    throw error
  }

  if (result.stderr.includes(TAR_CHANGED_MARKER)) {
    ctx.warn?.(
      'Files changed while the Fly sandbox template was being archived — the template may hold a ' +
        'torn copy of them. Quiesce the sandbox before committing if that matters.',
      { templateId: options.templateId, sandboxId: options.sandboxId },
    )
  }

  if (result.exitCode !== 0) {
    await discard(ctx, store, [key])
    throw new Error(
      t(
        'codeSandbox.flyio.error.templateCaptureFailed',
        { templateId: options.templateId, exitCode: String(result.exitCode) },
        {
          defaultValue:
            `Capturing template "${options.templateId}" failed inside the sandbox ` +
            `(exit ${result.exitCode}): ${result.stderr.slice(0, 500) || result.stdout.slice(0, 500)}`,
        },
      ),
    )
  }

  // The archive is uploaded by the SANDBOX, so the control plane confirms the
  // object rather than trusting the exit code it was handed.
  const stored = await store.head(key)
  if (!stored) {
    throw new Error(
      t(
        'codeSandbox.flyio.error.templateArchiveMissing',
        { templateId: options.templateId },
        {
          defaultValue:
            `Template "${options.templateId}" reported a successful capture but no archive is in ` +
            'the store. Check that the sandbox can reach the storage endpoint — an egress policy ' +
            'that does not allow it will block the upload.',
        },
      ),
    )
  }

  const manifest: TemplateManifest = {
    schema: MANIFEST_SCHEMA,
    id: options.templateId,
    capturePaths,
    createdAt: new Date().toISOString(),
    sizeBytes: stored.size,
    ...(options.label ? { label: options.label } : {}),
  }
  try {
    await store.putText(
      manifestKey(store, options.templateId),
      JSON.stringify(manifest),
      'application/json',
    )
  } catch (error) {
    // The manifest is what makes the template exist, so a template whose
    // manifest never landed must not leave its archive behind billing storage.
    await discard(ctx, store, [key])
    throw error
  }

  const template = await getTemplate(ctx, options.templateId)
  if (!template) {
    throw new Error(
      t(
        'codeSandbox.flyio.error.templateReadBackFailed',
        { templateId: options.templateId },
        {
          defaultValue: `Template "${options.templateId}" was written to ${templateRef(store, options.templateId)} but cannot be read back.`,
        },
      ),
    )
  }
  return template
}

/**
 * Delete a template, refusing while a restore is still reading it.
 * @param ctx - Template context.
 * @param templateId - The caller's identifier.
 * @throws {Error} When a restore is in flight, or the store cannot be read.
 */
export async function removeTemplate(ctx: TemplateContext, templateId: string): Promise<void> {
  assertTemplateId(templateId)
  const store = requireStore(ctx)

  // Uncaught on purpose: never delete on a failed lookup.
  const objects = await store.list(`${templatePrefix(store, templateId)}/`)
  if (objects.length === 0) return

  const entry = groupByTemplate(store, objects).get(templateId)
  if (entry && hasLiveLease(entry.leases, leaseTtlMs(ctx), Date.now())) {
    throw new Error(
      t(
        'codeSandbox.flyio.error.templateInUse',
        { templateId },
        {
          defaultValue:
            `Refusing to remove template "${templateId}": a sandbox is restoring from it right ` +
            'now, and removing it would fail that boot.',
        },
      ),
    )
  }

  // Everything under the prefix, so an orphaned archive from an interrupted
  // capture is reclaimed too. Removing what is already gone is a success —
  // callers reconcile, and reconciliation re-runs.
  await store.remove(objects.map((object) => object.key))
}

/**
 * Records that a restore of this template is in flight.
 *
 * The lease lives in the store rather than in this process, so a second control
 * plane enforcing a retention budget can see it. A control plane that dies
 * mid-restore leaves the lease behind; it stops counting once it is older than
 * the transfer budget, because no live restore can outlast that budget.
 * @param ctx - Template context.
 * @param templateId - The caller's identifier.
 * @param leaseId - Unique id for this restore.
 * @returns The lease's key, for release.
 */
export async function acquireRestoreLease(
  ctx: TemplateContext,
  templateId: string,
  leaseId: string,
): Promise<string> {
  const store = requireStore(ctx)
  const key = leaseKey(store, templateId, leaseId)
  await store.putText(key, new Date().toISOString(), 'text/plain')
  return key
}

/**
 * Releases a restore lease.
 *
 * Best-effort: the restore has already finished, and a stale lease only delays
 * an eviction until it ages out. Failing the boot over it would trade a
 * completed sandbox for a bookkeeping error.
 * @param ctx - Template context.
 * @param key - The lease key returned by {@link acquireRestoreLease}.
 */
export async function releaseRestoreLease(ctx: TemplateContext, key: string): Promise<void> {
  if (!ctx.store) return
  try {
    await ctx.store.remove([key])
  } catch (error) {
    ctx.warn?.('Failed to release a Fly sandbox template restore lease — it will age out', {
      key,
      error,
    })
  }
}

/**
 * Removes objects left behind by a capture that did not complete.
 * @param ctx - Template context.
 * @param store - The configured object store.
 * @param keys - Keys to remove.
 */
async function discard(ctx: TemplateContext, store: ObjectStore, keys: string[]): Promise<void> {
  try {
    await store.remove(keys)
  } catch (error) {
    ctx.warn?.('Failed to clean up a partial Fly sandbox template capture', { keys, error })
  }
}
