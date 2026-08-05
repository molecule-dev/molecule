/**
 * Reading back what already exists — descriptors, queries, volumes, and live
 * resource changes.
 *
 * These are the operations a control plane needs when it is NOT using a sandbox:
 * reconciling its own records against the daemon, finding what leaked, applying
 * an entitlement to a sandbox it just adopted. molecule.dev wrote all of them
 * directly against the Docker socket precisely because the provider interface
 * stopped at "make me a sandbox and let me run things in it".
 *
 * Two rules run through the whole module.
 *
 * **An empty list means "looked, found none".** Every enumeration here lets its
 * failure propagate rather than degrading to `[]`. The caller of a sweep DELETES
 * what it is told about, so "I could not enumerate" and "there is nothing" must
 * never arrive as the same value.
 *
 * **When in doubt, claim the resource is in use.** Attachment and usage decide
 * whether something gets deleted, so an unreadable answer resolves to the safe
 * side, loudly, rather than to the convenient one.
 *
 * @module
 */

import type {
  ListVolumesOptions,
  Sandbox,
  SandboxDescriptor,
  SandboxQuery,
  SandboxResources,
  VolumeInfo,
} from '@molecule/api-code-sandbox'

import type { DockerRequest } from './request.js'

/** What the inspection capabilities need from the provider. */
export interface InspectContext {
  request: DockerRequest
  /** Label namespace the provider stamps on the sandboxes it creates. */
  labelPrefix: string
  warn?: (message: string, meta?: Record<string, unknown>) => void
  debug?: (message: string, meta?: Record<string, unknown>) => void
}

/**
 * Docker's zero time. `State.StartedAt` holds it for a container that has been
 * created and never started — the shape of an interrupted creation, which owns
 * storage forever and will never run.
 */
const NEVER_STARTED = '0001-01-01T00:00:00Z'

/** Shape of the fields this module reads from `GET /containers/{id}/json`. */
interface ContainerInspect {
  Id: string
  Created?: string
  Image?: string
  State?: { Running?: boolean; StartedAt?: string }
  Config?: { Labels?: Record<string, string>; Image?: string }
  Mounts?: Array<{ Type?: string; Name?: string }>
  NetworkSettings?: {
    Ports?: Record<string, Array<{ HostIp?: string; HostPort?: string }> | null> | null
  }
}

/**
 * Turn a Docker inspect payload into a provider-agnostic descriptor.
 *
 * The status mapping is deliberately the SAME coarse one `get()` uses
 * (running / stopped) rather than a finer one. Two views of the same sandbox
 * that disagree about its state is a bug generator, and the case a finer mapping
 * would have served — never-started wreckage — is carried honestly by
 * `startedAt: null` instead.
 *
 * @param ctx - Inspection context.
 * @param info - The daemon's inspect payload.
 * @returns The descriptor.
 */
export function toDescriptor(ctx: InspectContext, info: ContainerInspect): SandboxDescriptor {
  const labels = info.Config?.Labels ?? {}
  const startedAt = info.State?.StartedAt
  const volumeFromMount = (info.Mounts ?? []).find((mount) => mount.Type === 'volume')?.Name

  const ports: SandboxDescriptor['ports'] = []
  for (const [spec, bindings] of Object.entries(info.NetworkSettings?.Ports ?? {})) {
    const sandboxPort = Number.parseInt(spec.split('/')[0] ?? '', 10)
    if (!Number.isInteger(sandboxPort)) continue
    for (const binding of bindings ?? []) {
      const port = Number.parseInt(binding.HostPort ?? '', 10)
      if (!Number.isInteger(port) || port <= 0) continue
      ports.push({ sandboxPort, host: binding.HostIp || '127.0.0.1', port })
    }
  }

  return {
    id: info.Id,
    projectId: labels[`${ctx.labelPrefix}.projectId`] ?? null,
    status: info.State?.Running ? 'running' : ('stopped' as Sandbox['status']),
    labels,
    createdAt: info.Created ?? null,
    startedAt: !startedAt || startedAt === NEVER_STARTED ? null : startedAt,
    templateRef: info.Config?.Image ?? info.Image ?? null,
    volumeName: labels[`${ctx.labelPrefix}.volumeName`] ?? volumeFromMount ?? null,
    ports,
  }
}

/**
 * Describe one sandbox without building a handle for it.
 *
 * @param ctx - Inspection context.
 * @param id - The sandbox id.
 * @returns The descriptor, or `null` when no such sandbox exists.
 */
export async function describeContainer(
  ctx: InspectContext,
  id: string,
): Promise<SandboxDescriptor | null> {
  try {
    const info = (await ctx.request(`/containers/${id}/json`)) as ContainerInspect
    return toDescriptor(ctx, info)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // 404 is the answer "no such sandbox". Every other failure is a failure to
    // look, and a caller that reads it as absence will happily "clean up" a
    // sandbox that is alive and busy.
    if (/\b404\b|no such container/i.test(message)) return null
    throw error
  }
}

/**
 * Find sandboxes by the labels the caller put on them.
 *
 * Two passes on purpose. The list endpoint answers cheaply but omits
 * `State.StartedAt`, which is the one field that distinguishes wreckage from a
 * sandbox that is merely stopped — so each match is then inspected. The label
 * filter is what keeps that bounded; an unfiltered query over a busy host is
 * one request per container and the caller should narrow it.
 *
 * A container that disappears between the two passes is skipped, not failed:
 * that is a real answer (it is gone), and reconciliation loops race removals
 * constantly.
 *
 * @param ctx - Inspection context.
 * @param query - Narrowing by label, status and project.
 * @returns Descriptors for every match.
 */
export async function findContainers(
  ctx: InspectContext,
  query?: SandboxQuery,
): Promise<SandboxDescriptor[]> {
  const labelFilters = Object.entries(query?.labels ?? {}).map(([key, value]) => `${key}=${value}`)
  if (query?.projectId) labelFilters.push(`${ctx.labelPrefix}.projectId=${query.projectId}`)

  const path =
    labelFilters.length > 0
      ? `/containers/json?all=true&filters=${encodeURIComponent(JSON.stringify({ label: labelFilters }))}`
      : '/containers/json?all=true'

  // Not wrapped: a failed listing must reach the caller. A recovery loop that
  // reads "nothing to recover" from a broken query silently stops recovering.
  const listed = (await ctx.request(path)) as Array<{ Id: string }>

  const descriptors: SandboxDescriptor[] = []
  for (const entry of Array.isArray(listed) ? listed : []) {
    const descriptor = await describeContainer(ctx, entry.Id)
    if (!descriptor) {
      ctx.debug?.('Sandbox vanished between listing and inspection', { id: entry.Id })
      continue
    }
    if (query?.statuses && !query.statuses.includes(descriptor.status)) continue
    descriptors.push(descriptor)
  }
  return descriptors
}

/**
 * Enumerate named volumes and whether anything still has them attached.
 *
 * Attachment comes from Docker's `dangling` filter, which means "not used by any
 * container, including stopped ones" — exactly the question a reclaim sweep is
 * asking. When that second query fails, every volume is reported as ATTACHED and
 * a warning is logged: an unreadable answer must not authorize deletion, and a
 * volume is the only copy of a user's work.
 *
 * @param ctx - Inspection context.
 * @param options - Narrowing by name prefix and attachment.
 * @returns Every matching volume.
 */
export async function listDockerVolumes(
  ctx: InspectContext,
  options?: ListVolumesOptions,
): Promise<VolumeInfo[]> {
  const listed = (await ctx.request('/volumes')) as {
    Volumes?: Array<{ Name: string; CreatedAt?: string; UsageData?: { Size?: number } }> | null
  }

  let unattached: Set<string> | null = null
  try {
    const dangling = (await ctx.request(
      `/volumes?filters=${encodeURIComponent(JSON.stringify({ dangling: ['true'] }))}`,
    )) as { Volumes?: Array<{ Name: string }> | null }
    unattached = new Set((dangling.Volumes ?? []).map((volume) => volume.Name))
  } catch (error) {
    ctx.warn?.(
      'Could not determine volume attachment — reporting every volume as attached so nothing is reclaimed on a guess',
      { error },
    )
  }

  const volumes: VolumeInfo[] = []
  for (const volume of listed.Volumes ?? []) {
    if (options?.namePrefix && !volume.Name.startsWith(options.namePrefix)) continue
    const attached = unattached === null ? true : !unattached.has(volume.Name)
    if (options?.attached !== undefined && options.attached !== attached) continue
    const size = volume.UsageData?.Size
    volumes.push({
      name: volume.Name,
      attached,
      createdAt: volume.CreatedAt ?? null,
      // Docker reports -1 when it has not computed usage (that needs a
      // system-wide scan), which is "unknown", not "empty".
      sizeBytes: typeof size === 'number' && size >= 0 ? size : null,
    })
  }
  return volumes
}

/**
 * Change a running sandbox's resource ceilings.
 *
 * `Memory` and `MemorySwap` are always sent together, and swap is always twice
 * RAM. Docker treats them as one setting — updating `Memory` alone leaves the old
 * swap ceiling, and this call is the LAST writer on the adoption path, so a swap
 * value that is not recomputed here silently strips the headroom the creation
 * path granted. That is not hypothetical; it happened to every claimed sandbox.
 *
 * `diskMB` throws. A provider that cannot enforce a ceiling must say so, because
 * the caller's alternative — believing the quota is applied — is worse than a
 * visible failure.
 *
 * @param ctx - Inspection context.
 * @param containerId - The sandbox to update.
 * @param resources - The ceilings to change; omitted fields keep their value.
 */
export async function updateContainerResources(
  ctx: InspectContext,
  containerId: string,
  resources: Partial<SandboxResources>,
): Promise<void> {
  if (resources.diskMB !== undefined) {
    throw new Error(
      'The Docker sandbox provider cannot cap a container or volume size portably ' +
        '(it needs a specific storage driver, e.g. overlay2 on xfs with pquota, and ' +
        'errors on the common overlay2/ext4 host), so `diskMB` cannot be applied. ' +
        'Cap disk at the host or volume level instead.',
    )
  }

  const update: Record<string, unknown> = {}
  if (resources.cpu !== undefined) update.NanoCPUs = Math.round(resources.cpu * 1e9)
  if (resources.memoryMB !== undefined) {
    const memoryBytes = Math.round(resources.memoryMB * 1024 * 1024)
    update.Memory = memoryBytes
    update.MemorySwap = memoryBytes * 2
  }
  if (resources.pidsLimit !== undefined) update.PidsLimit = resources.pidsLimit
  if (Object.keys(update).length === 0) return

  await ctx.request(`/containers/${containerId}/update`, 'POST', update)
}
