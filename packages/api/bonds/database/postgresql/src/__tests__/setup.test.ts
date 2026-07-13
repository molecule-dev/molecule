import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Use vi.hoisted to create shared mock instances
const { mockClientClass, mockReadFileSync, mockGlob } = vi.hoisted(() => {
  const mockQuery = vi.fn().mockResolvedValue({ rows: [] })
  const mockConnect = vi.fn().mockResolvedValue(undefined)
  const mockEnd = vi.fn().mockResolvedValue(undefined)

  const mockClient = {
    query: mockQuery,
    connect: mockConnect,
    end: mockEnd,
  }

  const mockClientClass = vi.fn(function () {
    return mockClient
  })
  const mockReadFileSync = vi.fn().mockReturnValue('SELECT 1;')
  const mockGlob = vi.fn().mockResolvedValue(['/test/__setup__/test.sql'])

  return { mockClient, mockClientClass, mockReadFileSync, mockGlob }
})

// Mock dependencies
vi.mock('pg', () => ({
  default: {
    Client: mockClientClass,
  },
  Client: mockClientClass,
}))

vi.mock('fs', () => ({
  default: {
    readFileSync: mockReadFileSync,
  },
  readFileSync: mockReadFileSync,
}))

vi.mock('glob', () => ({
  glob: mockGlob,
}))

describe('@molecule/api-database-postgresql/setup', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  describe('replacements', () => {
    it('should export default replacements', async () => {
      const { replacements } = await import('../setup/setup.js')

      expect(replacements).toBeDefined()
      expect(replacements['molecule-database']).toBeDefined()
      expect(replacements['molecule-user']).toBeDefined()
      expect(replacements['molecule-password']).toBeDefined()
    })

    it('should use environment variables for replacements', async () => {
      process.env.PGDATABASE = 'custom-db'
      process.env.PGUSER = 'custom-user'
      process.env.PGPASSWORD = 'custom-pass'
      vi.resetModules()

      const { replacements } = await import('../setup/setup.js')

      expect(replacements['molecule-database']).toBe('custom-db')
      expect(replacements['molecule-user']).toBe('custom-user')
      expect(replacements['molecule-password']).toBe('custom-pass')
    })
  })

  describe('SUPERPGUSER superuser path — removed [doc-drift fix]', () => {
    it('no longer creates a superuser client, even when SUPERPGUSER is set — the path was dead-on-arrival (role.sql/database.sql never shipped)', async () => {
      process.env.SUPERPGUSER = 'superuser'
      process.env.SUPERPGPASSWORD = 'superpass'
      process.env.SUPERPGHOST = 'superhost'
      vi.resetModules()

      const pg = await import('pg')
      const { setup } = await import('../setup/setup.js')

      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      await setup()

      // Exactly ONE client (the regular DATABASE_URL/PG* client) is ever created —
      // no second superuser-authenticated client, and no ENOENT reading role.sql.
      expect(pg.Client).toHaveBeenCalledTimes(1)
      expect(pg.Client).not.toHaveBeenCalledWith(expect.objectContaining({ user: 'superuser' }))

      consoleSpy.mockRestore()
    })
  })

  describe('runSQL()', () => {
    it('should execute SQL from file', async () => {
      const pg = await import('pg')
      const fs = await import('fs')
      const { runSQL } = await import('../setup/setup.js')

      const mockClient = new pg.Client()
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      await runSQL(mockClient as never, '/test/file.sql')

      expect(fs.readFileSync).toHaveBeenCalledWith('/test/file.sql')
      expect(mockClient.query).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith('Successfully executed file.sql.')

      consoleSpy.mockRestore()
    })

    it('should replace placeholder values in SQL', async () => {
      process.env.PGDATABASE = 'my-database'
      vi.resetModules()

      const pg = await import('pg')
      const fs = await import('fs')
      vi.mocked(fs.readFileSync).mockReturnValueOnce('CREATE DATABASE "molecule-database";')

      const { runSQL } = await import('../setup/setup.js')
      const mockClient = new pg.Client()
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      await runSQL(mockClient as never, '/test/file.sql')

      expect(mockClient.query).toHaveBeenCalledWith('CREATE DATABASE "my-database";')

      consoleSpy.mockRestore()
    })

    it('logs AND rethrows on a SQL execution error [ambiguous-failure fix — was swallowed]', async () => {
      const pg = await import('pg')
      const { runSQL } = await import('../setup/setup.js')

      const mockClient = new pg.Client()
      vi.mocked(mockClient.query).mockRejectedValueOnce(new Error('SQL Error'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      // Before the fix, a broken SQL file was only warn-logged — runSQL()
      // resolved normally and the caller had no way to detect the failure.
      await expect(runSQL(mockClient as never, '/test/file.sql')).rejects.toThrow('SQL Error')
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
      infoSpy.mockRestore()
    })
  })

  describe('setup()', () => {
    it('should setup database with default pattern', async () => {
      const pg = await import('pg')
      const { setup } = await import('../setup/setup.js')

      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      await setup()

      expect(pg.Client).toHaveBeenCalled()
      const mockClient = new pg.Client()
      expect(mockClient.connect).toHaveBeenCalled()
      expect(mockClient.end).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should setup database with custom pattern and base path', async () => {
      const { glob } = await import('glob')
      const { setup } = await import('../setup/setup.js')

      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      await setup('custom/**/*.sql', '/custom/path')

      expect(glob).toHaveBeenCalledWith('custom/**/*.sql', {
        cwd: '/custom/path',
        absolute: true,
      })

      consoleSpy.mockRestore()
    })

    it('should use DATABASE_URL when provided', async () => {
      // Local URL → no TLS (verify-by-default helper returns false for localhost).
      process.env.DATABASE_URL = 'postgres://localhost:5432/test'
      vi.resetModules()

      const pg = await import('pg')
      const { setup } = await import('../setup/setup.js')

      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      await setup()

      expect(pg.Client).toHaveBeenCalledWith({
        connectionString: 'postgres://localhost:5432/test',
        ssl: false,
      })

      consoleSpy.mockRestore()
    })

    it('verifies the server certificate for a remote DATABASE_URL (no blanket rejectUnauthorized:false)', async () => {
      // Regression: setup.ts used an unconditional { rejectUnauthorized: false },
      // which silently accepts any TLS cert (MITM-able). A remote DB with no
      // explicit opt-out must now verify against the system CA store.
      process.env.DATABASE_URL = 'postgres://user:pw@db.example-cloud.com:5432/test'
      delete process.env.DATABASE_SSL_REJECT_UNAUTHORIZED
      delete process.env.PGSSLROOTCERT
      vi.resetModules()

      const pg = await import('pg')
      const { setup } = await import('../setup/setup.js')

      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      await setup()

      expect(pg.Client).toHaveBeenCalledWith({
        connectionString: 'postgres://user:pw@db.example-cloud.com:5432/test',
        ssl: true,
      })

      consoleSpy.mockRestore()
    })

    it('should handle empty SQL file list', async () => {
      vi.resetModules()

      const { glob } = await import('glob')
      vi.mocked(glob).mockResolvedValueOnce([])

      const pg = await import('pg')
      const { setup } = await import('../setup/setup.js')

      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      await setup()

      const mockClient = new pg.Client()
      // Should still connect and disconnect even with no files
      expect(mockClient.connect).toHaveBeenCalled()
      expect(mockClient.end).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('propagates a failure as a thrown, summarized error instead of a silent success [doc-drift/ambiguous-failure fix]', async () => {
      vi.resetModules()

      const pg = await import('pg')
      const { setup } = await import('../setup/setup.js')

      const mockClient = new pg.Client()
      vi.mocked(mockClient.query).mockRejectedValueOnce(new Error('permission denied'))

      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Before the fix, runSQL() swallowed the error and setup() always resolved
      // — a broken SQL file "succeeded" (exit 0) having done nothing.
      await expect(setup()).rejects.toThrow(/permission denied/)
      // The connection is still closed even though the run failed.
      expect(mockClient.end).toHaveBeenCalled()

      infoSpy.mockRestore()
      errorSpy.mockRestore()
    })
  })

  describe('runSQL() edge cases', () => {
    it('replaces EVERY occurrence of a placeholder, not just the first [doc-drift fix]', async () => {
      process.env.PGDATABASE = 'test-db'
      process.env.PGUSER = 'test-user'
      process.env.PGPASSWORD = 'test-pass'
      vi.resetModules()

      const pg = await import('pg')
      const fs = await import('fs')
      // 'molecule-database' appears TWICE — a first-occurrence-only .replace()
      // would leave the second GRANT target un-substituted.
      vi.mocked(fs.readFileSync).mockReturnValueOnce(
        'CREATE DATABASE "molecule-database"; GRANT ALL ON DATABASE "molecule-database" TO "molecule-user";',
      )

      const { runSQL } = await import('../setup/setup.js')
      const mockClient = new pg.Client()
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      await runSQL(mockClient as never, '/test/grants.sql')

      expect(mockClient.query).toHaveBeenCalledWith(
        'CREATE DATABASE "test-db"; GRANT ALL ON DATABASE "test-db" TO "test-user";',
      )

      consoleSpy.mockRestore()
    })

    it('should preserve SQL that does not contain placeholders', async () => {
      vi.resetModules()

      const pg = await import('pg')
      const fs = await import('fs')
      const sqlContent = 'CREATE TABLE "users" (id UUID PRIMARY KEY);'
      vi.mocked(fs.readFileSync).mockReturnValueOnce(sqlContent)

      const { runSQL } = await import('../setup/setup.js')
      const mockClient = new pg.Client()
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      await runSQL(mockClient as never, '/test/create-table.sql')

      expect(mockClient.query).toHaveBeenCalledWith(sqlContent)

      consoleSpy.mockRestore()
    })

    it('should log the basename of the file on success', async () => {
      vi.resetModules()

      const pg = await import('pg')
      const { runSQL } = await import('../setup/setup.js')
      const mockClient = new pg.Client()
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      await runSQL(mockClient as never, '/some/deep/path/migration.sql')

      expect(consoleSpy).toHaveBeenCalledWith('Successfully executed migration.sql.')

      consoleSpy.mockRestore()
    })

    it('should log error with basename on failure, then rethrow', async () => {
      vi.resetModules()

      const pg = await import('pg')
      const { runSQL } = await import('../setup/setup.js')
      const mockClient = new pg.Client()
      const error = new Error('Syntax error')
      vi.mocked(mockClient.query).mockRejectedValueOnce(error)

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      await expect(runSQL(mockClient as never, '/path/to/broken.sql')).rejects.toThrow(error)

      expect(errorSpy).toHaveBeenCalledWith('Error executing broken.sql:', error)

      errorSpy.mockRestore()
      infoSpy.mockRestore()
    })
  })

  describe('index re-exports', () => {
    it('should export all setup functions from index', async () => {
      const setupIndex = await import('../setup/index.js')

      expect(setupIndex.replacements).toBeDefined()
      expect(setupIndex.runSQL).toBeDefined()
      expect(setupIndex.setup).toBeDefined()
      // The SUPERPGUSER superuser path (role.sql/database.sql) was removed —
      // it was dead-on-arrival, no such files ever shipped in this package.
      expect((setupIndex as Record<string, unknown>).superSQLFilenames).toBeUndefined()
    })
  })
})
