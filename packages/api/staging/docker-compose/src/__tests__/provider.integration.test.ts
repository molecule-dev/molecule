/**
 * REAL-DEPENDENCY integration tests — no mocks: the real filesystem, a real
 * YAML parser on the generated compose file, and (where safely possible) the
 * real `docker compose` CLI with graceful degradation when Docker is absent.
 *
 * The unit suites string-match generator output; they can't prove the compose
 * document is valid YAML, that the relative `env_file` paths actually resolve
 * to where `up()` writes the files, or that `list()` can read back what the
 * generator wrote. Those cross-file contracts are exactly where this driver
 * bites its consumer: a compose file that fails to parse, an env file layered
 * from the wrong directory, an environment that silently vanishes from
 * `list()`, or a teardown that deletes the Dockerfiles out from under a
 * SECOND still-running environment.
 *
 * No test here builds or starts containers (`up()` is exercised only through
 * its pure file-generation contract) — everything is deterministic on
 * machines with or without Docker.
 *
 * @module
 */

import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parse } from 'yaml'

import type { StagingEnvironment } from '@molecule/api-staging'

import { generateComposeFile } from '../compose-generator.js'
import {
  generateApiDockerfile,
  generateAppDockerfile,
  generateNginxConf,
} from '../dockerfile-generator.js'
import {
  containerStatus,
  fallbackPort,
  isComposeVersionSufficient,
  isContainerHealthy,
  parseComposeVersion,
  provider,
} from '../provider.js'

const STAGING_DIR = '.molecule/staging'

function makeEnv(slug: string, branch: string): StagingEnvironment {
  return {
    slug,
    branch,
    type: 'staging',
    name: `staging-${slug}`,
    createdAt: '2026-07-13T12:00:00.000Z',
    driver: 'docker-compose',
  }
}

/** Writes the same generated files up() writes, minus the docker build/start. */
async function scaffoldEnvironment(
  projectPath: string,
  env: StagingEnvironment,
  ports: { apiPort: number; appPort: number; dbPort: number },
): Promise<string> {
  const stagingDir = join(projectPath, STAGING_DIR)
  await mkdir(stagingDir, { recursive: true })
  await writeFile(join(stagingDir, 'Dockerfile.api'), generateApiDockerfile())
  await writeFile(
    join(stagingDir, 'Dockerfile.app'),
    generateAppDockerfile({ VITE_API_URL: `http://localhost:${ports.apiPort}/api` }),
  )
  await writeFile(join(stagingDir, 'nginx.conf'), generateNginxConf())
  const composeFile = join(stagingDir, `docker-compose.staging-${env.slug}.yml`)
  await writeFile(composeFile, generateComposeFile(env, { ...ports, dockerfilePath: stagingDir }))
  await writeFile(join(projectPath, `.env.staging.${env.slug}`), `PORT=${ports.apiPort}\n`)
  return composeFile
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch (_error) {
    // stat throws ENOENT for a missing path — that IS the answer being asked
    return false
  }
}

describe('@molecule/api-staging-docker-compose × REAL fs + REAL yaml', () => {
  let projectPath: string

  beforeEach(async () => {
    projectPath = await mkdtemp(join(tmpdir(), 'mol-staging-int-'))
  })

  afterEach(async () => {
    await rm(projectPath, { recursive: true, force: true })
  })

  it('full file lifecycle: generate → list() reads back slug, branch AND createdAt', async () => {
    const envA = makeEnv('feat-login', 'feature/login')
    const envB = makeEnv('fix-nav', 'fix/nav')
    await scaffoldEnvironment(projectPath, envA, { apiPort: 4001, appPort: 5174, dbPort: 5433 })
    await scaffoldEnvironment(projectPath, envB, { apiPort: 4002, appPort: 5175, dbPort: 5434 })

    const listed = await provider.list({ name: 'docker-compose', projectPath })
    const bySlug = Object.fromEntries(listed.map((e) => [e.slug, e]))

    expect(Object.keys(bySlug).sort()).toEqual(['feat-login', 'fix-nav'])
    expect(bySlug['feat-login'].branch).toBe('feature/login')
    expect(bySlug['feat-login'].name).toBe('staging-feat-login')
    // createdAt round-trips through the compose header — the interface
    // promises an ISO 8601 timestamp, not ''.
    expect(bySlug['feat-login'].createdAt).toBe('2026-07-13T12:00:00.000Z')
  })

  it('CONSUMER PROPERTY: the generated compose file is REAL parseable YAML with the right shape', async () => {
    const env = makeEnv('feat-login', 'feature/login')
    const composeFile = await scaffoldEnvironment(projectPath, env, {
      apiPort: 4007,
      appPort: 5180,
      dbPort: 5440,
    })

    const doc = parse(await readFile(composeFile, 'utf-8')) as {
      services: {
        api: {
          ports: string[]
          env_file: Array<{ path: string; required: boolean }>
          environment: string[]
          build: { dockerfile: string }
        }
        app: {
          ports: string[]
          build: { additional_contexts: Record<string, string>; args: Record<string, string> }
        }
        db: { ports: string[] }
      }
      volumes: Record<string, unknown>
      networks: Record<string, unknown>
    }

    expect(doc.services.api.ports).toEqual(['4007:4000'])
    expect(doc.services.app.ports).toEqual(['5180:80'])
    expect(doc.services.db.ports).toEqual(['5440:5432'])
    expect(Object.keys(doc.networks)).toEqual(['staging-feat-login'])
    expect(Object.keys(doc.volumes)).toEqual(['staging-feat-login-db'])

    // The two BASE env layers must be optional — a project without .env /
    // .env.staging must still be stageable ("env file not found" killed `up`
    // when these were plain string entries). The branch layer stays required.
    expect(doc.services.api.env_file).toEqual([
      { path: '../../.env', required: false },
      { path: '../../.env.staging', required: false },
      { path: `../../.env.staging.feat-login`, required: true },
    ])

    // PORT pinned to 4000 in `environment:` — env_file layers PORT=4007 (the
    // HOST port) into the container, and compose gives `environment:`
    // precedence. Without this override the API listens on 4007 inside the
    // container while the host mapping forwards to 4000: container "running",
    // URL dead.
    expect(doc.services.api.environment).toContain('PORT=4000')
    expect(doc.services.api.environment).toContain(
      'DATABASE_URL=postgresql://dev:dev@db:5432/molecule',
    )

    // nginx.conf reaches the app image via the staging named context — the app
    // build context itself has no nginx.conf.
    expect(doc.services.app.build.additional_contexts).toEqual({
      staging: join(projectPath, STAGING_DIR),
    })
    expect(doc.services.app.build.args.VITE_API_URL).toBe('http://localhost:4007/api')
  })

  it('CONSUMER PROPERTY: relative env_file paths resolve to exactly where up() writes them', async () => {
    // The compose file lives at <project>/.molecule/staging/…yml and up()
    // writes the branch env file at <project>/.env.staging.<slug>. env_file
    // paths are resolved relative to the COMPOSE FILE — a drift here (e.g.
    // one '../' too few) starts every container without its env layer.
    const env = makeEnv('feat-login', 'feature/login')
    const composeFile = await scaffoldEnvironment(projectPath, env, {
      apiPort: 4001,
      appPort: 5174,
      dbPort: 5433,
    })

    const doc = parse(await readFile(composeFile, 'utf-8')) as {
      services: { api: { env_file: Array<{ path: string }> } }
    }
    const branchLayer = doc.services.api.env_file.at(-1)!
    const resolved = resolve(dirname(composeFile), branchLayer.path)
    expect(resolved).toBe(join(projectPath, '.env.staging.feat-login'))
    expect(await exists(resolved)).toBe(true)
  })

  it('FAILURE DISAMBIGUATION: down() removes ONE environment without stranding the other', async () => {
    // down() must be safe when docker is unavailable or the containers never
    // started (it swallows the compose error and still cleans up files), and
    // it must NOT delete the shared Dockerfiles while another environment's
    // compose file still references them.
    const envA = makeEnv('feat-a', 'feat/a')
    const envB = makeEnv('feat-b', 'feat/b')
    await scaffoldEnvironment(projectPath, envA, { apiPort: 4001, appPort: 5174, dbPort: 5433 })
    await scaffoldEnvironment(projectPath, envB, { apiPort: 4002, appPort: 5175, dbPort: 5434 })
    const stagingDir = join(projectPath, STAGING_DIR)
    const config = { name: 'docker-compose', projectPath }

    await provider.down(envA, config)

    // A's files are gone…
    expect(await exists(join(stagingDir, 'docker-compose.staging-feat-a.yml'))).toBe(false)
    expect(await exists(join(projectPath, '.env.staging.feat-a'))).toBe(false)
    // …B's environment AND the shared build inputs survive.
    expect(await exists(join(stagingDir, 'docker-compose.staging-feat-b.yml'))).toBe(true)
    expect(await exists(join(stagingDir, 'Dockerfile.api'))).toBe(true)
    expect(await exists(join(stagingDir, 'Dockerfile.app'))).toBe(true)
    expect(await exists(join(stagingDir, 'nginx.conf'))).toBe(true)
    expect((await provider.list(config)).map((e) => e.slug)).toEqual(['feat-b'])

    // Tearing down the LAST environment sweeps the shared files too.
    await provider.down(envB, config)
    expect(await exists(join(stagingDir, 'Dockerfile.api'))).toBe(false)
    expect(await exists(join(stagingDir, 'Dockerfile.app'))).toBe(false)
    expect(await exists(join(stagingDir, 'nginx.conf'))).toBe(false)
    expect(await provider.list(config)).toEqual([])
  })

  it('FAILURE DISAMBIGUATION: "no environments" is an empty list, never a crash; stripped headers do not hide an environment', async () => {
    const config = { name: 'docker-compose', projectPath }
    // A project that never staged anything: empty answer, not an ENOENT throw.
    expect(await provider.list(config)).toEqual([])

    // A hand-edited compose file with the metadata comments stripped must NOT
    // silently vanish from list() while its containers may still be running —
    // the filename is the authoritative slug.
    const stagingDir = join(projectPath, STAGING_DIR)
    await mkdir(stagingDir, { recursive: true })
    const env = makeEnv('feat-edited', 'feature/edited')
    const yaml = generateComposeFile(env, { apiPort: 4001, appPort: 5174, dbPort: 5433 })
    const stripped = yaml
      .split('\n')
      .filter((line) => !line.startsWith('#'))
      .join('\n')
    await writeFile(join(stagingDir, 'docker-compose.staging-feat-edited.yml'), stripped)

    const listed = await provider.list(config)
    expect(listed).toHaveLength(1)
    expect(listed[0].slug).toBe('feat-edited')
    // Metadata that only lived in the comments degrades explicitly (branch
    // falls back to the slug, createdAt to '') instead of dropping the row.
    expect(listed[0].branch).toBe('feat-edited')
    expect(listed[0].createdAt).toBe('')
  })

  it('FAILURE DISAMBIGUATION: health() on a never-started environment degrades, never throws', async () => {
    // Callers must be able to tell "environment is not up" apart from a crash
    // in their own wiring. Depending on whether Docker is reachable on this
    // machine, the honest per-service answer is 'not found' (docker up,
    // containers absent) or 'unreachable' (docker missing/erroring) — both
    // are healthy:false, and neither may throw.
    const env = makeEnv('feat-login', 'feature/login')
    await scaffoldEnvironment(projectPath, env, { apiPort: 4001, appPort: 5174, dbPort: 5433 })

    const health = await provider.health(env, { name: 'docker-compose', projectPath })
    expect(health.healthy).toBe(false)
    expect(['not found', 'unreachable']).toContain(health.api?.status)
    expect(['not found', 'unreachable']).toContain(health.app?.status)
  })

  it('checkPrerequisites() answers a structured report instead of throwing', async () => {
    // Works with or without Docker installed: `met` must agree with `missing`.
    const result = await provider.checkPrerequisites()
    expect(typeof result.met).toBe('boolean')
    expect(Array.isArray(result.missing)).toBe(true)
    expect(result.met).toBe(result.missing.length === 0)
    for (const item of result.missing) {
      // Either the binary/plugin is entirely absent, or it's present but
      // below the 2.24 floor this driver's compose files require — named
      // explicitly (with the detected version) instead of a bare label.
      expect(
        item === 'docker' || item === 'docker-compose' || item.startsWith('docker-compose >= '),
      ).toBe(true)
    }
  })

  it('CONSUMER PROPERTY: logs({ follow: true }) throws a NAMED error instead of silently returning a static tail', async () => {
    // The core StagingDriver interface accepts `follow`, but this provider
    // has no streaming channel — before this fix it silently ignored the
    // option and returned one snapshot, indistinguishable from "follow
    // worked and there's just nothing new yet."
    const env = makeEnv('feat-login', 'feature/login')
    await scaffoldEnvironment(projectPath, env, { apiPort: 4001, appPort: 5174, dbPort: 5433 })
    const config = { name: 'docker-compose', projectPath }

    await expect(provider.logs(env, config, { follow: true })).rejects.toThrow(/follow/i)
  })
})

describe('generateComposeFile() × REAL yaml parser — api/app healthchecks', () => {
  // CONSUMER PROPERTY: health() used to equate container State === 'running'
  // with healthy because ONLY `db` defined a healthcheck — an api container
  // whose process is up but not serving (or crash-looping between polls)
  // read as fully healthy. Asserted against the REAL parsed document (not a
  // substring match) so a shape regression — e.g. the healthcheck landing
  // under the wrong service — is caught, not just its presence somewhere in
  // the file.
  const env: StagingEnvironment = {
    slug: 'feat-login',
    branch: 'feature/login',
    type: 'staging',
    name: 'staging-feat-login',
    createdAt: '2026-07-13T12:00:00.000Z',
    driver: 'docker-compose',
  }

  it('defines a healthcheck for the api service hitting its /health route', () => {
    const doc = parse(generateComposeFile(env, { apiPort: 4001, appPort: 5174, dbPort: 5433 })) as {
      services: { api: { healthcheck?: { test: string[] } } }
    }
    expect(doc.services.api.healthcheck).toBeDefined()
    expect(doc.services.api.healthcheck?.test.join(' ')).toMatch(/localhost:4000\/health/)
  })

  it('defines a healthcheck for the app service hitting its Nginx port', () => {
    const doc = parse(generateComposeFile(env, { apiPort: 4001, appPort: 5174, dbPort: 5433 })) as {
      services: { app: { healthcheck?: { test: string[] } } }
    }
    expect(doc.services.app.healthcheck).toBeDefined()
    expect(doc.services.app.healthcheck?.test.join(' ')).toMatch(/localhost:80/)
  })
})

describe('checkPrerequisites() version parsing (in-process, no docker exec)', () => {
  it('parses "Docker Compose version v2.24.5" (the real CLI output shape)', () => {
    expect(parseComposeVersion('Docker Compose version v2.24.5')).toEqual({
      major: 2,
      minor: 24,
    })
  })

  it('parses the bare --short form "2.24.5"', () => {
    expect(parseComposeVersion('2.24.5\n')).toEqual({ major: 2, minor: 24 })
  })

  it('returns null for unparseable output instead of throwing', () => {
    expect(parseComposeVersion('command not found')).toBeNull()
  })

  it('FAILURE DISAMBIGUATION: a pre-2.24 engine is insufficient, 2.24+ is sufficient', () => {
    expect(isComposeVersionSufficient({ major: 2, minor: 23 })).toBe(false)
    expect(isComposeVersionSufficient({ major: 2, minor: 24 })).toBe(true)
    expect(isComposeVersionSufficient({ major: 2, minor: 30 })).toBe(true)
    expect(isComposeVersionSufficient({ major: 1, minor: 29 })).toBe(false)
    expect(isComposeVersionSufficient({ major: 3, minor: 0 })).toBe(true)
  })
})

describe('fallbackPort() — deterministic per-slug port derivation', () => {
  it('is deterministic: the same slug always yields the same port', () => {
    expect(fallbackPort(4001, 'feat-login')).toBe(fallbackPort(4001, 'feat-login'))
  })

  it('CONSUMER PROPERTY: two different slugs land on different ports (collision the old fixed default always had)', () => {
    // Before this fix, EVERY environment without driverMeta fell back to the
    // exact same 4001/5174/5433 — a second concurrently-staged environment
    // always collided. Different slugs must usually disagree.
    const a = fallbackPort(4001, 'feat-login')
    const b = fallbackPort(4001, 'fix-nav-bug')
    expect(a).not.toBe(b)
  })

  it('stays within [base, base + range)', () => {
    const port = fallbackPort(4001, 'some-very-long-branch-name-slug', 100)
    expect(port).toBeGreaterThanOrEqual(4001)
    expect(port).toBeLessThan(4101)
  })

  it("api/app/db offset windows never overlap, so one slug's 3 fallback ports never collide with each other", () => {
    const slug = 'feat-login'
    const apiPort = fallbackPort(4001, slug)
    const appPort = fallbackPort(5174, slug)
    const dbPort = fallbackPort(5433, slug)
    const ports = new Set([apiPort, appPort, dbPort])
    expect(ports.size).toBe(3)
  })
})

describe('health() status parsing (in-process, no docker exec)', () => {
  it('FAILURE DISAMBIGUATION: a running-but-unhealthy container (real healthcheck reporting) is NOT healthy', () => {
    // This is the exact bug: before the fix, a container whose process is up
    // but never came up serving (Health: 'unhealthy' from the new
    // healthcheck) reported healthy because State was 'running'.
    expect(isContainerHealthy({ Service: 'api', State: 'running', Health: 'unhealthy' })).toBe(
      false,
    )
    expect(isContainerHealthy({ Service: 'api', State: 'running', Health: 'starting' })).toBe(false)
    expect(isContainerHealthy({ Service: 'api', State: 'running', Health: 'healthy' })).toBe(true)
  })

  it('falls back to State==="running" only when there is NO healthcheck (empty Health)', () => {
    expect(isContainerHealthy({ Service: 'db', State: 'running', Health: '' })).toBe(true)
    expect(isContainerHealthy({ Service: 'db', State: 'exited', Health: '' })).toBe(false)
  })

  it('an absent container is never healthy', () => {
    expect(isContainerHealthy(undefined)).toBe(false)
  })

  it('containerStatus() surfaces the real Health value, not just running/exited', () => {
    expect(containerStatus({ Service: 'api', State: 'running', Health: 'unhealthy' })).toBe(
      'unhealthy',
    )
    expect(containerStatus({ Service: 'db', State: 'running', Health: '' })).toBe('running')
    expect(containerStatus(undefined)).toBe('not found')
  })
})
