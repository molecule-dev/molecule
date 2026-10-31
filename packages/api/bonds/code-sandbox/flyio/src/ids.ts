/**
 * Sandbox identifiers, Fly app naming, and Machine-state mapping.
 *
 * A Fly Machine id is only unique WITHIN its app, and every Machines API call is
 * `/v1/apps/{app_name}/machines/{machine_id}` — so a bare Machine id is not
 * enough to address a Machine. The core interface hands `get(id)` and
 * `destroy(id)` a single opaque string, so this provider's sandbox id is the
 * composite `"<app>:<machineId>"`. Fly app names cannot contain `:` and Machine
 * ids are hex, so the split is unambiguous. Callers must keep treating the id as
 * opaque; nothing outside this module should parse it.
 *
 * @module
 */

import { createHash } from 'node:crypto'

import { t } from '@molecule/api-i18n'

import type { FlyMachineState } from './types.js'

/** Separator between the app name and the Machine id in a composite sandbox id. */
const ID_SEPARATOR = ':'

/**
 * Builds the opaque sandbox id addressing one Machine inside one app.
 * @param app - Fly app name.
 * @param machineId - Fly Machine id.
 * @returns The composite sandbox id.
 */
export function toSandboxId(app: string, machineId: string): string {
  return `${app}${ID_SEPARATOR}${machineId}`
}

/**
 * Splits a composite sandbox id back into its app and Machine id.
 * @param id - A sandbox id previously produced by {@link toSandboxId}.
 * @returns The app name and Machine id.
 * @throws {Error} When the id is not in `<app>:<machineId>` form — a bare Machine id
 *   cannot be addressed, and guessing an app would delete or inspect the wrong
 *   tenant's Machine.
 */
export function parseSandboxId(id: string): { app: string; machineId: string } {
  const index = id.indexOf(ID_SEPARATOR)
  if (index <= 0 || index === id.length - 1) {
    throw new Error(
      t(
        'codeSandbox.flyio.error.badSandboxId',
        { id },
        {
          defaultValue:
            `Invalid Fly sandbox id "${id}" — expected "<app>:<machineId>". ` +
            'Fly Machine ids are only unique within an app, so a bare Machine id cannot be addressed.',
        },
      ),
    )
  }
  return { app: id.slice(0, index), machineId: id.slice(index + 1) }
}

/** Normalize one prefix/project component for a Fly DNS label. */
function sanitizeAppNamePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** The one namespace mapping shared by app naming and fleet discovery. */
export function appNameNamespace(prefix: string): {
  prefix: string
  hashedPrefix: string
  searchPrefixes: string[]
} {
  const safePrefix = sanitizeAppNamePart(prefix) || 'mol-sandbox'
  // appNameForProject uses a 20-character digest, leaving 42 characters plus
  // the separating hyphen inside Fly's 63-character DNS-label limit.
  const hashedPrefix = safePrefix.slice(0, 42).replace(/-+$/, '')
  return {
    prefix: safePrefix,
    hashedPrefix,
    searchPrefixes: [...new Set([`${safePrefix}-`, `${hashedPrefix}-`])],
  }
}

/**
 * Derive the collision-free app name for a complete prefix/project identity.
 * @param prefix - Configured app-name prefix.
 * @param projectId - Complete project or deploy identity.
 * @returns A DNS-safe app name no longer than 63 characters.
 */
export function appNameForProject(prefix: string, projectId: string): string {
  const namespace = appNameNamespace(prefix)
  const safePrefix = namespace.prefix
  const safeProject = sanitizeAppNamePart(projectId)
  if (!safeProject) {
    throw new Error(
      t(
        'codeSandbox.flyio.error.badProjectId',
        { projectId },
        {
          defaultValue: `Cannot derive a Fly app name from projectId "${projectId}" — no DNS-safe characters.`,
        },
      ),
    )
  }
  const readable = `${safePrefix}-${safeProject}`
  if (readable.length <= 63) return readable
  const digest = createHash('sha256').update(`${prefix}\0${projectId}`).digest('hex').slice(0, 20)
  return `${namespace.hashedPrefix}-${digest}`
}

/**
 * Maps a Fly Machine state onto the core `Sandbox['status']` union.
 *
 * The core has four statuses and Fly documents seventeen states
 * (https://fly.io/docs/machines/machine-states/), so the mapping is lossy by
 * construction:
 *
 * - `started` → `running`.
 * - `suspended`/`suspending` → `sleeping`. This is the mapping this bond exists
 *   for: `sleep()` suspends and `wake()` resumes from the memory snapshot.
 * - In-flight transitions (`creating`, `starting`, `restarting`, `updating`,
 *   `replacing`, `migrated`) → `creating`, i.e. "not usable yet, will be".
 * - Everything else — including `failed` and `launch_failed` — → `stopped`.
 *   The core union has no error status, so a failed Machine is reported as
 *   stopped; `failed` is distinguishable only via {@link isFailedState}.
 *
 * An unrecognized future state falls through to `stopped`, which is the safe
 * default: a caller retries a start rather than assuming a usable sandbox.
 * @param state - Raw Fly Machine state string.
 * @returns The core sandbox status.
 */
export function mapMachineState(
  state: FlyMachineState,
): 'creating' | 'running' | 'sleeping' | 'stopped' {
  switch (state) {
    case 'started':
      return 'running'
    case 'suspended':
    case 'suspending':
      return 'sleeping'
    case 'creating':
    case 'starting':
    case 'restarting':
    case 'updating':
    case 'replacing':
    case 'migrated':
      return 'creating'
    default:
      return 'stopped'
  }
}

/**
 * Reports whether a Fly Machine state means the Machine errored, rather than
 * having been stopped on purpose. {@link mapMachineState} flattens both to
 * `stopped` because the core union has no failure status, so this is the only
 * way to tell them apart.
 * @param state - Raw Fly Machine state string.
 * @returns `true` for `failed` and `launch_failed`.
 */
export function isFailedState(state: FlyMachineState): boolean {
  return state === 'failed' || state === 'launch_failed'
}
