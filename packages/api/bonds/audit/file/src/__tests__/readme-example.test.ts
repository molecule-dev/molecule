/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, against a real temp directory.
 *
 * @module
 */
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { auditExport, log, query, setProvider } from '@molecule/api-audit'

import { createProvider } from '../index.js'

describe('README @example', () => {
  const originalDir = process.env.AUDIT_LOG_DIR
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'audit-readme-'))
    // A not-yet-existing subdirectory proves the example's mkdir() step is what creates it.
    process.env.AUDIT_LOG_DIR = join(root, 'audit-logs')
  })

  afterEach(async () => {
    if (originalDir === undefined) delete process.env.AUDIT_LOG_DIR
    else process.env.AUDIT_LOG_DIR = originalDir
    await rm(root, { recursive: true, force: true })
  })

  it('logs to an NDJSON file, queries it back and exports CSV', async () => {
    const directory = process.env.AUDIT_LOG_DIR ?? './audit-logs'
    await mkdir(directory, { recursive: true })
    setProvider(createProvider({ directory, maxFileSize: 10 * 1024 * 1024 }))

    await log({
      actor: 'user:123',
      action: 'project.delete',
      resource: 'project',
      resourceId: 'proj-42',
      details: { name: 'Old site' },
    })

    const recent = await query({ actor: 'user:123', page: 1, perPage: 20 })
    const csv = await auditExport({ resource: 'project' }, 'csv')

    const files = await readdir(directory)
    expect(files).toEqual([`audit-${new Date().toISOString().slice(0, 10)}.ndjson`])

    expect(recent.total).toBe(1)
    expect(recent.totalPages).toBe(1)
    expect(recent.data[0]).toMatchObject({
      actor: 'user:123',
      action: 'project.delete',
      resource: 'project',
      resourceId: 'proj-42',
      details: { name: 'Old site' },
    })
    expect(recent.data[0]?.timestamp).toBeInstanceOf(Date)

    const lines = csv.toString('utf-8').split('\n')
    expect(lines[0]).toBe('id,actor,action,resource,resourceId,details,ip,userAgent,timestamp')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('user:123,project.delete,project,proj-42')
  })
})
