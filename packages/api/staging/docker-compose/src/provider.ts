/**
 * Docker Compose staging driver.
 *
 * Implements the `StagingDriver` interface using Docker Compose to manage
 * local ephemeral staging environments. Each branch gets isolated containers,
 * networking, and database volumes.
 *
 * @module
 */

import { exec } from 'node:child_process'
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

import type {
  EnvironmentHealth,
  EnvironmentLogs,
  EnvironmentUrls,
  StagingDriver,
  StagingDriverConfig,
  StagingEnvironment,
} from '@molecule/api-staging'

import { generateComposeFile } from './compose-generator.js'
import {
  generateApiDockerfile,
  generateAppDockerfile,
  generateNginxConf,
} from './dockerfile-generator.js'

const execAsync = promisify(exec)

const STAGING_DIR = '.molecule/staging'

/** Minimum Docker Compose version this driver's generated files require. */
const REQUIRED_COMPOSE_VERSION = { major: 2, minor: 24 } as const

/**
 * Parses a major.minor pair out of `docker compose version` output (e.g.
 * `'Docker Compose version v2.24.5'` or the bare `'2.24.5'` from `--short`).
 * Exported for testing — no need to shell out to `docker` to verify the
 * parsing logic against every version-string shape Compose has printed.
 *
 * @param output - Raw stdout from `docker compose version`.
 * @returns The parsed `{ major, minor }`, or `null` if no version substring is found.
 */
export function parseComposeVersion(output: string): { major: number; minor: number } | null {
  const match = output.match(/v?(\d+)\.(\d+)\.(\d+)/)
  if (!match) return null
  return { major: Number(match[1]), minor: Number(match[2]) }
}

/**
 * Checks a parsed Compose version against {@link REQUIRED_COMPOSE_VERSION}.
 *
 * @param version - A parsed `{ major, minor }` version.
 * @returns `true` if the version meets or exceeds the minimum this driver requires.
 */
export function isComposeVersionSufficient(version: { major: number; minor: number }): boolean {
  if (version.major !== REQUIRED_COMPOSE_VERSION.major) {
    return version.major > REQUIRED_COMPOSE_VERSION.major
  }
  return version.minor >= REQUIRED_COMPOSE_VERSION.minor
}

/**
 * Deterministically derives a fallback host port from an environment slug so
 * that TWO environments falling back to this path (no `driverMeta` — direct
 * provider callers only; `mlcl stage up` always allocates real ports via
 * `allocatePort()`) don't collide on the SAME fixed port. Uses FNV-1a, a
 * stable, dependency-free 32-bit hash — the same slug always maps to the same
 * port across repeated `up()` calls, so redeploying an existing slug doesn't
 * relocate it.
 *
 * @param base - The base port for this role (api/app/db).
 * @param slug - The environment slug to derive an offset from.
 * @param range - Width of the offset window (default 100 — kept narrow enough
 *   that api/app/db's offset windows never overlap each other).
 * @returns `base` plus a slug-derived offset in `[0, range)`.
 */
export function fallbackPort(base: number, slug: string, range: number = 100): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < slug.length; i++) {
    hash ^= slug.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return base + ((hash >>> 0) % range)
}

/** A single service row parsed from `docker compose ps --format json`. */
export interface ComposeContainerStatus {
  Service: string
  State: string
  Health: string
}

/**
 * Determines whether a parsed `docker compose ps` container row counts as
 * healthy. `generateComposeFile()` now defines a `healthcheck:` for the `api`
 * AND `app` services (it always did for `db`), so `Health` is populated for
 * both — `State === 'running'` alone used to be treated as healthy, which is
 * also true of a process that is up but never came up serving (or is
 * crash-looping between polls). Falls back to `State === 'running'` only for
 * a container with NO healthcheck (an environment staged with a compose file
 * generated before this fix, or a hand-edited one) — an empty `Health`
 * string is how `docker compose ps` reports "no healthcheck defined".
 *
 * @param container - The parsed container row, or `undefined` if the service wasn't found.
 * @returns `true` if the container is healthy.
 */
export function isContainerHealthy(container?: ComposeContainerStatus): boolean {
  return (
    container !== undefined &&
    (container.Health ? container.Health === 'healthy' : container.State === 'running')
  )
}

/**
 * Returns the human-readable status for a parsed `docker compose ps`
 * container row — the `Health` value when a healthcheck is defined,
 * otherwise the raw container `State`, or `'not found'` when the service
 * isn't running at all.
 *
 * @param container - The parsed container row, or `undefined` if the service wasn't found.
 * @returns The status string.
 */
export function containerStatus(container?: ComposeContainerStatus): string {
  return container === undefined ? 'not found' : container.Health || container.State
}

/**
 * Returns the compose file path for an environment.
 *
 * @param projectPath - Absolute project root path.
 * @param slug - Environment slug.
 * @returns Absolute path to the compose file.
 */
function composeFilePath(projectPath: string, slug: string): string {
  return join(projectPath, STAGING_DIR, `docker-compose.staging-${slug}.yml`)
}

/**
 * Returns the Docker Compose project name for an environment.
 *
 * @param slug - Environment slug.
 * @returns The project name.
 */
function projectName(slug: string): string {
  return `molecule-staging-${slug}`
}

/**
 * Runs a docker compose command for a staging environment.
 *
 * @param projectPath - Absolute project root path.
 * @param slug - Environment slug.
 * @param command - The docker compose subcommand (e.g. 'up -d', 'down').
 * @returns The command output.
 */
async function compose(
  projectPath: string,
  slug: string,
  command: string,
): Promise<{ stdout: string; stderr: string }> {
  const file = composeFilePath(projectPath, slug)
  return execAsync(`docker compose -f "${file}" -p "${projectName(slug)}" ${command}`, {
    cwd: projectPath,
    // exec's default maxBuffer is 1 MB — a cold `up -d --build` (npm ci + vite
    // build inside the images) easily exceeds that, and exceeding it KILLS the
    // child mid-build with "maxBuffer length exceeded", which reads like a
    // build failure. Give compose output generous headroom.
    maxBuffer: 64 * 1024 * 1024,
  })
}

/**
 * Docker Compose staging driver implementation.
 */
export const provider: StagingDriver = {
  name: 'docker-compose',

  async checkPrerequisites(): Promise<{ met: boolean; missing: string[] }> {
    const missing: string[] = []

    try {
      await execAsync('docker --version')
    } catch (_error) {
      // docker not found — prerequisite check adds it to missing list
      missing.push('docker')
    }

    try {
      const { stdout } = await execAsync('docker compose version')
      const version = parseComposeVersion(stdout)
      // An unparseable version string is NOT treated as insufficient — the
      // command succeeded (the plugin exists), and failing open avoids a
      // false-positive block on an unexpected output format. A genuinely too
      // old engine parses fine (Compose has always printed a semver) and is
      // named explicitly here so `up`'s opaque compose parse error (from the
      // long-syntax `env_file` + BuildKit `additional_contexts` this driver's
      // generated files require) never has to be the first signal.
      if (version && !isComposeVersionSufficient(version)) {
        missing.push(
          `docker-compose >= ${REQUIRED_COMPOSE_VERSION.major}.${REQUIRED_COMPOSE_VERSION.minor} (found ${version.major}.${version.minor})`,
        )
      }
    } catch (_error) {
      // docker compose plugin not found — prerequisite check adds it to missing list
      missing.push('docker-compose')
    }

    return { met: missing.length === 0, missing }
  },

  async up(env: StagingEnvironment, config: StagingDriverConfig): Promise<EnvironmentUrls> {
    const stagingDir = join(config.projectPath, STAGING_DIR)
    await mkdir(stagingDir, { recursive: true })

    // Determine ports from environment driverMeta, or derive a fallback
    // deterministically from the slug — see fallbackPort() for why this beats
    // a fixed default (every direct-caller environment used to collide on
    // literally the same three ports).
    const apiPort = (env.driverMeta?.apiPort as number) ?? fallbackPort(4001, env.slug)
    const appPort = (env.driverMeta?.appPort as number) ?? fallbackPort(5174, env.slug)
    const dbPort = (env.driverMeta?.dbPort as number) ?? fallbackPort(5433, env.slug)

    // Generate Dockerfiles and nginx config in .molecule/staging/
    await writeFile(join(stagingDir, 'Dockerfile.api'), generateApiDockerfile())
    await writeFile(
      join(stagingDir, 'Dockerfile.app'),
      generateAppDockerfile({ VITE_API_URL: `http://localhost:${apiPort}/api` }),
    )
    await writeFile(join(stagingDir, 'nginx.conf'), generateNginxConf())

    // Generate compose file (references the generated Dockerfiles)
    const composeContent = generateComposeFile(env, {
      apiPort,
      appPort,
      dbPort,
      dockerfilePath: stagingDir,
    })
    await writeFile(composeFilePath(config.projectPath, env.slug), composeContent)

    // Generate branch-specific .env file (API runtime vars only — Vite vars
    // are injected as Docker build args, not runtime env vars).
    // PORT/DATABASE_URL here are the HOST-side view (host port mapping, host
    // dbPort) for tooling run outside Docker (migrations, smoke scripts). The
    // same file is also layered into the api container via env_file, so the
    // compose file's `environment:` block overrides both back to the
    // in-container values (PORT=4000, DATABASE_URL=...@db:5432) — compose
    // gives `environment:` precedence over `env_file:`.
    const envContent = [
      `# Auto-generated by mlcl stage up`,
      `# Branch: ${env.branch}`,
      `# Slug: ${env.slug}`,
      `NODE_ENV=staging`,
      `PORT=${apiPort}`,
      `DATABASE_URL=postgresql://dev:dev@localhost:${dbPort}/molecule`,
      `STAGING_SLUG=${env.slug}`,
      `STAGING_BRANCH=${env.branch}`,
      '',
    ].join('\n')
    await writeFile(join(config.projectPath, `.env.staging.${env.slug}`), envContent)

    // Start containers
    await compose(config.projectPath, env.slug, 'up -d --build')

    return {
      api: `http://localhost:${apiPort}`,
      app: `http://localhost:${appPort}`,
    }
  },

  async down(env: StagingEnvironment, config: StagingDriverConfig): Promise<void> {
    try {
      await compose(config.projectPath, env.slug, 'down -v')
    } catch (_error) {
      // Containers may already be stopped — not an error
    }

    const stagingDir = join(config.projectPath, STAGING_DIR)

    // Clean up this environment's own files (best-effort)
    const filesToRemove = [
      composeFilePath(config.projectPath, env.slug),
      join(config.projectPath, `.env.staging.${env.slug}`),
    ]

    // Dockerfile.api / Dockerfile.app / nginx.conf are SHARED by every
    // environment's compose file — deleting them while another environment is
    // still up breaks that environment's next rebuild. Only remove them once
    // no other environment's compose file remains.
    let composeFilesLeft: string[] = []
    try {
      const { readdir } = await import('node:fs/promises')
      composeFilesLeft = (await readdir(stagingDir)).filter(
        (f) =>
          f.startsWith('docker-compose.staging-') &&
          f.endsWith('.yml') &&
          f !== `docker-compose.staging-${env.slug}.yml`,
      )
    } catch (_error) {
      // Staging dir already gone — nothing shared left to preserve
    }
    if (composeFilesLeft.length === 0) {
      filesToRemove.push(
        join(stagingDir, 'Dockerfile.api'),
        join(stagingDir, 'Dockerfile.app'),
        join(stagingDir, 'nginx.conf'),
      )
    }

    for (const filePath of filesToRemove) {
      try {
        await rm(filePath)
      } catch (_error) {
        // File may not exist — safe to ignore
      }
    }
  },

  async health(env: StagingEnvironment, config: StagingDriverConfig): Promise<EnvironmentHealth> {
    try {
      const { stdout } = await compose(config.projectPath, env.slug, 'ps --format json')

      // Parse container status
      const containers = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line) as ComposeContainerStatus
          } catch (_error) {
            // Malformed JSON line from docker compose ps — skip it
            return null
          }
        })
        .filter(Boolean) as ComposeContainerStatus[]

      const apiContainer = containers.find((c) => c.Service === 'api')
      const appContainer = containers.find((c) => c.Service === 'app')

      return {
        healthy: isContainerHealthy(apiContainer) && isContainerHealthy(appContainer),
        api: { status: containerStatus(apiContainer) },
        app: { status: containerStatus(appContainer) },
      }
    } catch (_error) {
      // docker compose ps failed (e.g. no containers running) — return degraded health
      return {
        healthy: false,
        api: { status: 'unreachable' },
        app: { status: 'unreachable' },
      }
    }
  },

  async logs(
    env: StagingEnvironment,
    config: StagingDriverConfig,
    options?: { service?: 'api' | 'app' | 'all'; tail?: number; follow?: boolean },
  ): Promise<EnvironmentLogs> {
    if (options?.follow) {
      // The core StagingDriver interface accepts `follow`, but this provider
      // returns a single Promise<EnvironmentLogs> snapshot — there is no
      // streaming channel to honor it on. Silently returning a static tail
      // (the old behavior) left a caller who asked to follow logs staring at
      // a snapshot with no signal that follow never happened. Reject
      // explicitly instead so the unsupported option is a loud, named error
      // rather than a silent downgrade.
      throw new Error(
        "@molecule/api-staging-docker-compose: logs({ follow: true }) is not supported — this driver returns a single log snapshot, not a stream. Omit 'follow' (or poll logs()) to get the current tail.",
      )
    }

    const service = options?.service ?? 'all'
    const tail = options?.tail ?? 100
    const serviceArg = service === 'all' ? '' : ` ${service}`

    const { stdout } = await compose(
      config.projectPath,
      env.slug,
      `logs --tail ${tail}${serviceArg}`,
    )

    return {
      lines: stdout.split('\n').filter(Boolean),
      service,
    }
  },

  async list(config: StagingDriverConfig): Promise<StagingEnvironment[]> {
    const stagingDir = join(config.projectPath, STAGING_DIR)
    const { readdir } = await import('node:fs/promises')

    try {
      await access(stagingDir)
    } catch (_error) {
      // Staging directory does not exist yet — no environments to list
      return []
    }

    const files = await readdir(stagingDir)
    const composeFiles = files.filter(
      (f) => f.startsWith('docker-compose.staging-') && f.endsWith('.yml'),
    )

    const environments: StagingEnvironment[] = []
    for (const file of composeFiles) {
      const content = await readFile(join(stagingDir, file), 'utf-8')

      const branchMatch = content.match(/^# Branch: (.+)$/m)
      const slugMatch = content.match(/^# Slug: (.+)$/m)
      const createdMatch = content.match(/^# Created: (.+)$/m)

      // The filename is the authoritative slug (up() derives both from
      // env.slug). Header comments are only metadata: if a user hand-edited
      // the file and stripped them, the environment must NOT silently vanish
      // from list() while its containers keep running.
      const fileSlug = file.slice('docker-compose.staging-'.length, -'.yml'.length)
      const slug = slugMatch?.[1] ?? fileSlug

      environments.push({
        slug,
        branch: branchMatch?.[1] ?? slug,
        type: 'staging',
        name: `staging-${slug}`,
        createdAt: createdMatch?.[1] ?? '',
        driver: 'docker-compose',
      })
    }

    return environments
  },
}
