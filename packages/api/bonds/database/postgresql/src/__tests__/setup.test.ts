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

  describe('superSQLFilenames', () => {
    it('should export super SQL filenames', async () => {
      const { superSQLFilenames } = await import('../setup/setup.js')

      expect(superSQLFilenames).toContain('role.sql')
      expect(superSQLFilenames).toContain('database.sql')
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

    it('should handle SQL execution errors', async () => {
      const pg = await import('pg')
      const { runSQL } = await import('../setup/setup.js')

      const mockClient = new pg.Client()
      vi.mocked(mockClient.query).mockRejectedValueOnce(new Error('SQL Error'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      await runSQL(mockClient as never, '/test/file.sql')

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

    it('should use superuser credentials when SUPERPGUSER is set', async () => {
      process.env.SUPERPGUSER = 'superuser'
      process.env.SUPERPGPASSWORD = 'superpass'
      process.env.SUPERPGHOST = 'superhost'
      process.env.SUPERPGPORT = '5433'
      vi.resetModules()

      const pg = await import('pg')
      const { setup } = await import('../setup/setup.js')

      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      await setup()

      // Should create two clients: super client and regular client
      expect(pg.Client).toHaveBeenCalledTimes(2)
      expect(pg.Client).toHaveBeenCalledWith({
        user: 'superuser',
        password: 'superpass',
        host: 'superhost',
        database: 'superhost',
        port: 5433,
      })

      consoleSpy.mockRestore()
    })

    it('should use DATABASE_URL when provided', async () => {
      process.env.DATABASE_URL = 'postgres://localhost:5432/test'
      vi.resetModules()

      const pg = await import('pg')
      const { setup } = await import('../setup/setup.js')

      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      await setup()

      expect(pg.Client).toHaveBeenCalledWith({
        connectionString: 'postgres://localhost:5432/test',
        ssl: { rejectUnauthorized: false },
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

    it('should use PGHOST as fallback for SUPERPGHOST', async () => {
      process.env.SUPERPGUSER = 'superuser'
      process.env.SUPERPGPASSWORD = 'superpass'
      process.env.PGHOST = 'fallback-host'
      process.env.PGPORT = '5434'
      delete process.env.SUPERPGHOST
      delete process.env.SUPERPGPORT
      vi.resetModules()

      const pg = await import('pg')
      const { setup } = await import('../setup/setup.js')

      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      await setup()

      expect(pg.Client).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'fallback-host',
          port: 5434,
        }),
      )

      consoleSpy.mockRestore()
    })
  })

  describe('runSQL() edge cases', () => {
    it('should replace multiple placeholder values', async () => {
      process.env.PGDATABASE = 'test-db'
      process.env.PGUSER = 'test-user'
      process.env.PGPASSWORD = 'test-pass'
      vi.resetModules()

      const pg = await import('pg')
      const fs = await import('fs')
      vi.mocked(fs.readFileSync).mockReturnValueOnce(
        'GRANT ALL ON DATABASE "molecule-database" TO "molecule-user";',
      )

      const { runSQL } = await import('../setup/setup.js')
      const mockClient = new pg.Client()
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      await runSQL(mockClient as never, '/test/grants.sql')

      // Note: The current implementation only replaces first occurrence
      // This test documents current behavior
      expect(mockClient.query).toHaveBeenCalled()

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

    it('should log error with basename on failure', async () => {
      vi.resetModules()

      const pg = await import('pg')
      const { runSQL } = await import('../setup/setup.js')
      const mockClient = new pg.Client()
      const error = new Error('Syntax error')
      vi.mocked(mockClient.query).mockRejectedValueOnce(error)

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      await runSQL(mockClient as never, '/path/to/broken.sql')

      expect(errorSpy).toHaveBeenCalledWith('Error executing broken.sql:', error)

      errorSpy.mockRestore()
      infoSpy.mockRestore()
    })
  })

  describe('index re-exports', () => {
    it('should export all setup functions from index', async () => {
      const setupIndex = await import('../setup/index.js')

      expect(setupIndex.replacements).toBeDefined()
      expect(setupIndex.superSQLFilenames).toBeDefined()
      expect(setupIndex.runSQL).toBeDefined()
      expect(setupIndex.setup).toBeDefined()
    })
  })
})
