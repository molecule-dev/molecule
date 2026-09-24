/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, against real `.env` / `.env.local`
 * files in a temporary working directory.
 *
 * @module
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { get, getRequired, resolveAll, setProvider } from '@molecule/api-secrets'

import { createEnvProvider } from '../index.js'

describe('README @example', () => {
  const originalCwd = process.cwd()
  let dir = ''

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'secrets-env-readme-'))
    await writeFile(
      join(dir, '.env'),
      'DATABASE_URL=postgres://app@db.example.com/app\nSESSION_SECRET=from-env-file\nLOG_LEVEL=warn\n',
    )
    await writeFile(join(dir, '.env.local'), 'LOG_LEVEL=debug\n')
    process.chdir(dir)
    vi.stubEnv('DATABASE_URL', undefined)
    vi.stubEnv('LOG_LEVEL', undefined)
    vi.stubEnv('SESSION_SECRET', 'from-real-env')
  })

  afterEach(async () => {
    process.chdir(originalCwd)
    vi.unstubAllEnvs()
    await rm(dir, { recursive: true, force: true })
  })

  it('layers the files, keeps real env vars, and resolves required secrets', async () => {
    setProvider(createEnvProvider({ layers: ['.env', '.env.local'] }))

    await resolveAll(['DATABASE_URL', 'SESSION_SECRET'])

    const databaseUrl = await getRequired('DATABASE_URL')
    const logLevel = (await get('LOG_LEVEL')) ?? 'info'

    expect(databaseUrl).toBe('postgres://app@db.example.com/app')
    expect(process.env.DATABASE_URL).toBe('postgres://app@db.example.com/app')
    // The real environment wins over the file.
    expect(process.env.SESSION_SECRET).toBe('from-real-env')
    // The later layer (.env.local) wins over .env.
    expect(logLevel).toBe('debug')
  })
})
