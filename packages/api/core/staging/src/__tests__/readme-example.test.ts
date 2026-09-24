/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real docker-compose
 * driver with only the `docker` CLI (`node:child_process.execFile`) mocked and
 * a temporary project directory.
 *
 * @module
 */
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type ExecCallback = (error: Error | null, result?: { stdout: string; stderr: string }) => void

const { execFile, dockerCalls } = vi.hoisted(() => {
  const dockerCalls: string[][] = []
  const execFile = vi.fn((_file: string, args: string[], ...rest: unknown[]) => {
    const callback = rest[rest.length - 1] as ExecCallback
    dockerCalls.push(args)
    let stdout = ''
    if (args[0] === '--version') stdout = 'Docker version 27.0.3'
    else if (args[0] === 'compose' && args[1] === 'version')
      stdout = 'Docker Compose version v2.29.1'
    else if (args.includes('ps')) {
      stdout = [
        JSON.stringify({ Service: 'api', State: 'running', Health: 'healthy' }),
        JSON.stringify({ Service: 'app', State: 'running', Health: 'healthy' }),
      ].join('\n')
    }
    callback(null, { stdout, stderr: '' })
  })
  return { execFile, dockerCalls }
})

vi.mock('node:child_process', () => ({ execFile }))

import { provider } from '@molecule/api-staging-docker-compose'

import type { StagingDriverConfig, StagingEnvironment } from '../index.js'
import { branchToSlug, getProvider, setProvider } from '../index.js'

describe('README @example', () => {
  let projectPath = ''

  beforeEach(async () => {
    projectPath = await mkdtemp(join(tmpdir(), 'staging-readme-'))
    dockerCalls.length = 0
  })

  afterEach(async () => {
    await rm(projectPath, { recursive: true, force: true })
  })

  it('brings a branch environment up, reports health, and tears it down', async () => {
    setProvider(provider)
    const driver = getProvider()
    if (!driver) throw new Error('No staging driver bonded')

    const prerequisites = await driver.checkPrerequisites()
    expect(prerequisites).toEqual({ met: true, missing: [] })

    const branch = 'feature/login-form'
    const slug = branchToSlug(branch)
    expect(slug).toBe('feature-login-form')
    const env: StagingEnvironment = {
      slug,
      branch,
      type: 'staging',
      name: `staging-${slug}`,
      createdAt: new Date().toISOString(),
      driver: driver.name,
    }
    const config: StagingDriverConfig = { name: 'my-app', projectPath }

    const urls = await driver.up(env, config)
    expect(urls.api).toMatch(/^http:\/\/localhost:\d+$/)
    expect(urls.app).toMatch(/^http:\/\/localhost:\d+$/)
    expect(dockerCalls.some((args) => args.includes('up') && args.includes('--build'))).toBe(true)
    expect(await readdir(join(projectPath, '.molecule/staging'))).toContain(
      'docker-compose.staging-feature-login-form.yml',
    )

    const health = await driver.health(env, config)
    expect(health).toEqual({
      healthy: true,
      api: { status: 'healthy' },
      app: { status: 'healthy' },
    })

    await driver.down(env, config)
    expect(dockerCalls.some((args) => args.includes('down'))).toBe(true)
    expect(await readdir(projectPath)).not.toContain('.env.staging.feature-login-form')
  })
})
