/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the file bond on the real
 * filesystem (inside a throwaway working directory).
 *
 * @module
 */
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createProvider } from '@molecule/api-audit-file'

import { auditExport, log, query, setProvider } from '../index.js'

describe('README @example', () => {
  const originalCwd = process.cwd()
  let workDir = ''

  beforeAll(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'audit-readme-'))
    process.chdir(workDir)
  })

  afterAll(async () => {
    process.chdir(originalCwd)
    await rm(workDir, { recursive: true, force: true })
  })

  it('bonds the file provider, logs an entry, queries and exports it', async () => {
    await mkdir('./audit-logs', { recursive: true })
    setProvider(createProvider({ directory: './audit-logs' }))

    await log({
      actor: 'user:1',
      action: 'project.create',
      resource: 'project',
      resourceId: 'proj-42',
      ip: '203.0.113.7',
    })

    const { data, total } = await query({ actor: 'user:1', page: 1, perPage: 20 })
    expect(total).toBe(1)
    expect(data[0]?.action).toBe('project.create')
    expect(data[0]?.timestamp instanceof Date).toBe(true)

    const csv = await auditExport({ resource: 'project' }, 'csv')
    expect(Buffer.isBuffer(csv)).toBe(true)
    expect(csv.toString('utf8')).toContain('project.create')

    expect((await readdir(join(workDir, 'audit-logs'))).length).toBe(1)
  })
})
