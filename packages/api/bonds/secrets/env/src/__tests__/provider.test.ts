import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { createEnvProvider as CreateEnvProviderFn } from '../provider.js'

let createEnvProvider: typeof CreateEnvProviderFn

describe('@molecule/api-secrets-env', () => {
  let testDir: string
  let testEnvPath: string

  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    createEnvProvider = providerModule.createEnvProvider

    // Create a unique temp directory for test .env files
    testDir = join(
      tmpdir(),
      `secrets-env-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    )
    await mkdir(testDir, { recursive: true })
    testEnvPath = join(testDir, '.env')
  })

  afterEach(async () => {
    // Clean up test env vars
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('__TEST_ENV_')) {
        delete process.env[key]
      }
    }

    // Try to clean up temp files
    try {
      await unlink(testEnvPath)
    } catch {
      /* no-op */
    }
  })

  describe('createEnvProvider', () => {
    it('should create a provider with name "env"', () => {
      const provider = createEnvProvider()
      expect(provider.name).toBe('env')
    })

    it('should create a provider with all required methods', () => {
      const provider = createEnvProvider()
      expect(typeof provider.get).toBe('function')
      expect(typeof provider.getMany).toBe('function')
      expect(typeof provider.set).toBe('function')
      expect(typeof provider.delete).toBe('function')
      expect(typeof provider.isAvailable).toBe('function')
      expect(typeof provider.syncToEnv).toBe('function')
    })
  })

  describe('get', () => {
    it('should return process.env value when no .env file exists', async () => {
      process.env.__TEST_ENV_GET__ = 'from-env'
      const provider = createEnvProvider({ path: join(testDir, 'nonexistent.env') })

      const result = await provider.get('__TEST_ENV_GET__')
      expect(result).toBe('from-env')
    })

    it('should return undefined for missing key', async () => {
      const provider = createEnvProvider({ path: join(testDir, 'nonexistent.env') })

      const result = await provider.get('__TOTALLY_MISSING_KEY__')
      expect(result).toBeUndefined()
    })

    it('should return value from .env file', async () => {
      await writeFile(testEnvPath, 'MY_KEY=file-value\n')
      const provider = createEnvProvider({ path: testEnvPath })

      const result = await provider.get('MY_KEY')
      expect(result).toBe('file-value')
    })

    it('should prefer process.env over .env file by default', async () => {
      process.env.__TEST_ENV_PREF__ = 'env-value'
      await writeFile(testEnvPath, '__TEST_ENV_PREF__=file-value\n')
      const provider = createEnvProvider({ path: testEnvPath })

      const result = await provider.get('__TEST_ENV_PREF__')
      expect(result).toBe('env-value')
    })

    it('should prefer .env file over process.env when override is true', async () => {
      process.env.__TEST_ENV_OVER__ = 'env-value'
      await writeFile(testEnvPath, '__TEST_ENV_OVER__=file-value\n')
      const provider = createEnvProvider({ path: testEnvPath, override: true })

      const result = await provider.get('__TEST_ENV_OVER__')
      expect(result).toBe('file-value')
    })

    it('should fall back to process.env when key not in .env file', async () => {
      process.env.__TEST_ENV_FALLBACK__ = 'env-fallback'
      await writeFile(testEnvPath, 'OTHER_KEY=other-value\n')
      const provider = createEnvProvider({ path: testEnvPath })

      const result = await provider.get('__TEST_ENV_FALLBACK__')
      expect(result).toBe('env-fallback')
    })

    it('should handle .env file with quoted values', async () => {
      await writeFile(testEnvPath, `DOUBLE_QUOTED="hello world"\nSINGLE_QUOTED='hello world'\n`)
      const provider = createEnvProvider({ path: testEnvPath })

      expect(await provider.get('DOUBLE_QUOTED')).toBe('hello world')
      expect(await provider.get('SINGLE_QUOTED')).toBe('hello world')
    })

    it('should handle escape sequences in double-quoted values', async () => {
      await writeFile(testEnvPath, 'ESCAPED="line1\\nline2"\n')
      const provider = createEnvProvider({ path: testEnvPath })

      const result = await provider.get('ESCAPED')
      expect(result).toBe('line1\nline2')
    })

    it('should skip comments and empty lines in .env file', async () => {
      await writeFile(
        testEnvPath,
        `# This is a comment\n\nKEY1=value1\n# Another comment\nKEY2=value2\n`,
      )
      const provider = createEnvProvider({ path: testEnvPath })

      expect(await provider.get('KEY1')).toBe('value1')
      expect(await provider.get('KEY2')).toBe('value2')
    })

    it('should handle values with equals signs', async () => {
      await writeFile(testEnvPath, 'CONNECTION=postgres://user:pass=123@localhost/db\n')
      const provider = createEnvProvider({ path: testEnvPath })

      const result = await provider.get('CONNECTION')
      expect(result).toBe('postgres://user:pass=123@localhost/db')
    })

    it('should cache .env file content', async () => {
      await writeFile(testEnvPath, 'CACHED_KEY=original\n')
      const provider = createEnvProvider({ path: testEnvPath })

      // First read loads the file
      expect(await provider.get('CACHED_KEY')).toBe('original')

      // Modify the file (but cache should still return old value)
      await writeFile(testEnvPath, 'CACHED_KEY=modified\n')

      // Should still return cached value
      expect(await provider.get('CACHED_KEY')).toBe('original')
    })
  })

  describe('getMany', () => {
    it('should return multiple values from process.env', async () => {
      process.env.__TEST_ENV_A__ = 'value-a'
      process.env.__TEST_ENV_B__ = 'value-b'
      const provider = createEnvProvider({ path: join(testDir, 'nonexistent.env') })

      const result = await provider.getMany([
        '__TEST_ENV_A__',
        '__TEST_ENV_B__',
        '__TEST_ENV_MISSING__',
      ])
      expect(result).toEqual({
        __TEST_ENV_A__: 'value-a',
        __TEST_ENV_B__: 'value-b',
        __TEST_ENV_MISSING__: undefined,
      })
    })

    it('should return values from .env file', async () => {
      await writeFile(testEnvPath, 'KEY_X=val-x\nKEY_Y=val-y\n')
      const provider = createEnvProvider({ path: testEnvPath })

      const result = await provider.getMany(['KEY_X', 'KEY_Y'])
      expect(result).toEqual({
        KEY_X: 'val-x',
        KEY_Y: 'val-y',
      })
    })

    it('should prefer process.env over .env file by default', async () => {
      process.env.__TEST_ENV_MANY__ = 'env-value'
      await writeFile(testEnvPath, '__TEST_ENV_MANY__=file-value\nFILE_ONLY=file\n')
      const provider = createEnvProvider({ path: testEnvPath })

      const result = await provider.getMany(['__TEST_ENV_MANY__', 'FILE_ONLY'])
      expect(result.__TEST_ENV_MANY__).toBe('env-value')
      expect(result.FILE_ONLY).toBe('file')
    })

    it('should prefer .env file when override is true', async () => {
      process.env.__TEST_ENV_MANY_O__ = 'env-value'
      await writeFile(testEnvPath, '__TEST_ENV_MANY_O__=file-value\n')
      const provider = createEnvProvider({ path: testEnvPath, override: true })

      const result = await provider.getMany(['__TEST_ENV_MANY_O__'])
      expect(result.__TEST_ENV_MANY_O__).toBe('file-value')
    })
  })

  describe('set', () => {
    it('should set a value and write to .env file', async () => {
      await writeFile(testEnvPath, '')
      const provider = createEnvProvider({ path: testEnvPath })

      await provider.set!('NEW_KEY', 'new-value')

      // Should be available via get
      expect(await provider.get('NEW_KEY')).toBe('new-value')

      // Should also be set in process.env
      expect(process.env.NEW_KEY).toBe('new-value')

      delete process.env.NEW_KEY
    })

    it('should update existing value in .env file', async () => {
      await writeFile(testEnvPath, 'EXISTING=old-value\n')
      const provider = createEnvProvider({ path: testEnvPath })

      // Trigger loading the file
      await provider.get('EXISTING')

      await provider.set!('EXISTING', 'updated-value')

      expect(await provider.get('EXISTING')).toBe('updated-value')

      delete process.env.EXISTING
    })

    it('should quote values with special characters', async () => {
      await writeFile(testEnvPath, '')
      const provider = createEnvProvider({ path: testEnvPath })

      await provider.set!('SPECIAL', 'value with spaces')

      // Re-read the file to verify
      const { readFile } = await import('node:fs/promises')
      const content = await readFile(testEnvPath, 'utf-8')
      expect(content).toContain('SPECIAL="value with spaces"')

      delete process.env.SPECIAL
    })
  })

  describe('delete', () => {
    it('should delete a key from .env file and process.env', async () => {
      await writeFile(testEnvPath, 'TO_DELETE=value\nKEEP=other\n')
      const provider = createEnvProvider({ path: testEnvPath })

      // Load the file
      await provider.get('TO_DELETE')

      await provider.delete!('TO_DELETE')

      expect(await provider.get('TO_DELETE')).toBeUndefined()
      expect(process.env.TO_DELETE).toBeUndefined()

      // Other keys should remain
      expect(await provider.get('KEEP')).toBe('other')
    })
  })

  describe('isAvailable', () => {
    it('should return true when .env file exists', async () => {
      await writeFile(testEnvPath, 'KEY=value\n')
      const provider = createEnvProvider({ path: testEnvPath })

      expect(await provider.isAvailable()).toBe(true)
    })

    it('should return true even when .env file does not exist', async () => {
      const provider = createEnvProvider({ path: join(testDir, 'nonexistent.env') })

      // The env provider is always available because it can fall back to process.env
      expect(await provider.isAvailable()).toBe(true)
    })
  })

  describe('syncToEnv', () => {
    it('should sync values from .env file to process.env', async () => {
      await writeFile(testEnvPath, '__TEST_ENV_SYNC_A__=synced-a\n__TEST_ENV_SYNC_B__=synced-b\n')
      const provider = createEnvProvider({ path: testEnvPath })

      await provider.syncToEnv!(['__TEST_ENV_SYNC_A__', '__TEST_ENV_SYNC_B__'])

      expect(process.env.__TEST_ENV_SYNC_A__).toBe('synced-a')
      expect(process.env.__TEST_ENV_SYNC_B__).toBe('synced-b')
    })

    it('should not override existing env vars by default', async () => {
      process.env.__TEST_ENV_SYNC_EXIST__ = 'original'
      await writeFile(testEnvPath, '__TEST_ENV_SYNC_EXIST__=from-file\n')
      const provider = createEnvProvider({ path: testEnvPath })

      await provider.syncToEnv!(['__TEST_ENV_SYNC_EXIST__'])

      expect(process.env.__TEST_ENV_SYNC_EXIST__).toBe('original')
    })

    it('should override existing env vars when override is true', async () => {
      process.env.__TEST_ENV_SYNC_OVER__ = 'original'
      await writeFile(testEnvPath, '__TEST_ENV_SYNC_OVER__=from-file\n')
      const provider = createEnvProvider({ path: testEnvPath, override: true })

      await provider.syncToEnv!(['__TEST_ENV_SYNC_OVER__'])

      expect(process.env.__TEST_ENV_SYNC_OVER__).toBe('from-file')
    })

    it('should only sync requested keys', async () => {
      await writeFile(testEnvPath, '__TEST_ENV_SYNC_YES__=yes\n__TEST_ENV_SYNC_NO__=no\n')
      const provider = createEnvProvider({ path: testEnvPath })

      await provider.syncToEnv!(['__TEST_ENV_SYNC_YES__'])

      expect(process.env.__TEST_ENV_SYNC_YES__).toBe('yes')
      expect(process.env.__TEST_ENV_SYNC_NO__).toBeUndefined()
    })

    it('should skip keys not found in .env file', async () => {
      await writeFile(testEnvPath, '__TEST_ENV_SYNC_FOUND__=value\n')
      const provider = createEnvProvider({ path: testEnvPath })

      await provider.syncToEnv!(['__TEST_ENV_SYNC_FOUND__', '__TEST_ENV_SYNC_NOTFOUND__'])

      expect(process.env.__TEST_ENV_SYNC_FOUND__).toBe('value')
      expect(process.env.__TEST_ENV_SYNC_NOTFOUND__).toBeUndefined()
    })

    it('should not re-sync on subsequent calls without override', async () => {
      await writeFile(testEnvPath, '__TEST_ENV_SYNC_ONCE__=value\n')
      const provider = createEnvProvider({ path: testEnvPath })

      await provider.syncToEnv!(['__TEST_ENV_SYNC_ONCE__'])
      expect(process.env.__TEST_ENV_SYNC_ONCE__).toBe('value')

      // Delete from process.env manually
      delete process.env.__TEST_ENV_SYNC_ONCE__

      // Second sync should be a no-op because loaded flag is set
      await provider.syncToEnv!(['__TEST_ENV_SYNC_ONCE__'])
      expect(process.env.__TEST_ENV_SYNC_ONCE__).toBeUndefined()
    })
  })

  describe('.env file parsing edge cases', () => {
    it('should handle empty .env file', async () => {
      await writeFile(testEnvPath, '')
      const provider = createEnvProvider({ path: testEnvPath })

      expect(await provider.get('ANY_KEY')).toBeUndefined()
    })

    it('should handle .env file with only comments', async () => {
      await writeFile(testEnvPath, '# comment 1\n# comment 2\n')
      const provider = createEnvProvider({ path: testEnvPath })

      expect(await provider.get('ANY_KEY')).toBeUndefined()
    })

    it('should handle .env file with spaces around equals', async () => {
      await writeFile(testEnvPath, 'KEY_SPACE = value_space\n')
      const provider = createEnvProvider({ path: testEnvPath })

      // The key should be trimmed
      expect(await provider.get('KEY_SPACE')).toBe('value_space')
    })

    it('should handle empty values', async () => {
      await writeFile(testEnvPath, 'EMPTY_VAL=\n')
      const provider = createEnvProvider({ path: testEnvPath })

      expect(await provider.get('EMPTY_VAL')).toBe('')
    })

    it('should handle .env file with trailing newlines', async () => {
      await writeFile(testEnvPath, 'KEY=value\n\n\n')
      const provider = createEnvProvider({ path: testEnvPath })

      expect(await provider.get('KEY')).toBe('value')
    })

    it('should handle tab escape in double-quoted values', async () => {
      await writeFile(testEnvPath, 'TAB_VAL="col1\\tcol2"\n')
      const provider = createEnvProvider({ path: testEnvPath })

      expect(await provider.get('TAB_VAL')).toBe('col1\tcol2')
    })

    it('should handle backslash escape in double-quoted values', async () => {
      await writeFile(testEnvPath, 'SLASH_VAL="a\\\\b\\\\c"\n')
      const provider = createEnvProvider({ path: testEnvPath })

      expect(await provider.get('SLASH_VAL')).toBe('a\\b\\c')
    })
  })

  describe('default provider export', () => {
    it('should export a default provider instance', async () => {
      const { provider } = await import('../provider.js')
      expect(provider).toBeDefined()
      expect(provider.name).toBe('env')
      expect(typeof provider.get).toBe('function')
      expect(typeof provider.getMany).toBe('function')
      expect(typeof provider.set).toBe('function')
      expect(typeof provider.delete).toBe('function')
      expect(typeof provider.isAvailable).toBe('function')
      expect(typeof provider.syncToEnv).toBe('function')
    })
  })

  describe('index exports', () => {
    it('should export createEnvProvider and provider', async () => {
      const indexModule = await import('../index.js')
      expect(indexModule.createEnvProvider).toBeDefined()
      expect(indexModule.provider).toBeDefined()
    })

    it('should not re-export from @molecule/api-secrets', async () => {
      const indexModule = (await import('../index.js')) as Record<string, unknown>
      // Core interface should be imported from @molecule/api-secrets directly, not from bonds
      expect(indexModule.setProvider).toBeUndefined()
      expect(indexModule.getProvider).toBeUndefined()
      expect(indexModule.hasProvider).toBeUndefined()
    })
  })
})
