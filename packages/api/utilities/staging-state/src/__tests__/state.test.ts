import { mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  addEnvironment,
  allocatePort,
  getEnvironment,
  listEnvironments,
  loadState,
  removeEnvironment,
  saveState,
  statePath,
} from '../state.js'
import type { StagingEnvironmentRecord } from '../types.js'

let testDir: string

function makeRecord(
  slug: string,
  overrides?: Partial<StagingEnvironmentRecord>,
): StagingEnvironmentRecord {
  return {
    slug,
    branch: `feature/${slug}`,
    driver: 'docker-compose',
    createdAt: '2026-02-21T10:00:00Z',
    updatedAt: '2026-02-21T10:00:00Z',
    urls: {},
    ports: {},
    status: 'running',
    ...overrides,
  }
}

describe('staging state', () => {
  beforeEach(async () => {
    testDir = join(tmpdir(), `molecule-staging-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  describe('statePath', () => {
    it('should return the correct path', () => {
      expect(statePath('/my/project')).toBe('/my/project/.molecule/staging.json')
    })
  })

  describe('loadState', () => {
    it('should return empty state when file does not exist', async () => {
      const state = await loadState(testDir)
      expect(state).toEqual({ version: 1, environments: {} })
    })

    it('should load existing state', async () => {
      const state = { version: 1 as const, environments: { test: makeRecord('test') } }
      await mkdir(join(testDir, '.molecule'), { recursive: true })
      const content = JSON.stringify(state)
      const { writeFile } = await import('node:fs/promises')
      await writeFile(join(testDir, '.molecule', 'staging.json'), content)

      const loaded = await loadState(testDir)
      expect(loaded.environments.test.slug).toBe('test')
    })
  })

  describe('saveState', () => {
    it('should create directory and write file', async () => {
      const state = { version: 1 as const, environments: {} }
      await saveState(testDir, state)

      const content = await readFile(statePath(testDir), 'utf-8')
      expect(JSON.parse(content)).toEqual(state)
    })
  })

  describe('addEnvironment', () => {
    it('should add a new environment', async () => {
      await addEnvironment(testDir, makeRecord('feat-login'))
      const env = await getEnvironment(testDir, 'feat-login')
      expect(env?.slug).toBe('feat-login')
      expect(env?.branch).toBe('feature/feat-login')
    })

    it('should update an existing environment', async () => {
      await addEnvironment(testDir, makeRecord('test', { status: 'creating' }))
      await addEnvironment(testDir, makeRecord('test', { status: 'running' }))
      const env = await getEnvironment(testDir, 'test')
      expect(env?.status).toBe('running')
    })
  })

  describe('removeEnvironment', () => {
    it('should remove an environment', async () => {
      await addEnvironment(testDir, makeRecord('test'))
      await removeEnvironment(testDir, 'test')
      const env = await getEnvironment(testDir, 'test')
      expect(env).toBeUndefined()
    })

    it('should not fail when removing non-existent environment', async () => {
      await expect(removeEnvironment(testDir, 'nope')).resolves.not.toThrow()
    })
  })

  describe('listEnvironments', () => {
    it('should return empty array when no environments', async () => {
      const list = await listEnvironments(testDir)
      expect(list).toEqual([])
    })

    it('should return all environments', async () => {
      await addEnvironment(testDir, makeRecord('first'))
      await addEnvironment(testDir, makeRecord('second'))
      const list = await listEnvironments(testDir)
      expect(list).toHaveLength(2)
    })
  })

  describe('allocatePort', () => {
    it('should allocate three consecutive ports', async () => {
      const ports = await allocatePort(testDir, { start: 4001, end: 4099 })
      expect(ports).toEqual({ api: 4001, app: 4002, db: 4003 })
    })

    it('should skip ports already in use', async () => {
      await addEnvironment(
        testDir,
        makeRecord('existing', {
          ports: { api: 4001, app: 4002, db: 4003 },
        }),
      )
      const ports = await allocatePort(testDir, { start: 4001, end: 4099 })
      expect(ports).toEqual({ api: 4004, app: 4005, db: 4006 })
    })

    it('should throw when no ports available', async () => {
      await addEnvironment(
        testDir,
        makeRecord('full', {
          ports: { api: 4001, app: 4002, db: 4003 },
        }),
      )
      await expect(allocatePort(testDir, { start: 4001, end: 4003 })).rejects.toThrow(
        'No free ports available',
      )
    })
  })
})
