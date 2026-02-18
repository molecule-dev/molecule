import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type {
  DatabaseConfig,
  DatabaseConnection,
  DatabasePool,
  DatabaseProvider,
  DatabaseTransaction,
  QueryResult,
} from '../types.js'

// We need to reset the module state between tests
let setPool: typeof ProviderModule.setPool
let getPool: typeof ProviderModule.getPool
let hasPool: typeof ProviderModule.hasPool
let query: typeof ProviderModule.query
let connect: typeof ProviderModule.connect
let end: typeof ProviderModule.end

describe('database provider', () => {
  beforeEach(async () => {
    // Reset modules to get fresh state
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setPool = providerModule.setPool
    getPool = providerModule.getPool
    hasPool = providerModule.hasPool
    query = providerModule.query
    connect = providerModule.connect
    end = providerModule.end
  })

  describe('pool management', () => {
    it('should throw when no pool is set', () => {
      expect(() => getPool()).toThrow('Database pool not configured. Call setPool() first.')
    })

    it('should return false when no pool is configured', () => {
      expect(hasPool()).toBe(false)
    })

    it('should set and get pool', () => {
      const mockPool: DatabasePool = {
        query: vi.fn(),
        connect: vi.fn(),
        end: vi.fn(),
      }
      setPool(mockPool)
      expect(getPool()).toBe(mockPool)
    })

    it('should return true when pool is configured', () => {
      const mockPool: DatabasePool = {
        query: vi.fn(),
        connect: vi.fn(),
        end: vi.fn(),
      }
      setPool(mockPool)
      expect(hasPool()).toBe(true)
    })
  })

  describe('query', () => {
    it('should throw when no pool is set', async () => {
      await expect(query('SELECT 1')).rejects.toThrow('Database pool not configured')
    })

    it('should call pool query with text only', async () => {
      const mockResult: QueryResult = { rows: [{ id: 1 }], rowCount: 1 }
      const mockQuery = vi.fn().mockResolvedValue(mockResult)
      const mockPool: DatabasePool = {
        query: mockQuery,
        connect: vi.fn(),
        end: vi.fn(),
      }
      setPool(mockPool)

      const result = await query('SELECT * FROM users')

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users', undefined)
      expect(result).toBe(mockResult)
    })

    it('should call pool query with parameterized values', async () => {
      const mockResult: QueryResult<{ id: number; name: string }> = {
        rows: [{ id: 1, name: 'Test' }],
        rowCount: 1,
      }
      const mockQuery = vi.fn().mockResolvedValue(mockResult)
      const mockPool: DatabasePool = {
        query: mockQuery,
        connect: vi.fn(),
        end: vi.fn(),
      }
      setPool(mockPool)

      const result = await query<{ id: number; name: string }>(
        'SELECT * FROM users WHERE id = $1 AND status = $2',
        [1, 'active'],
      )

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1 AND status = $2', [
        1,
        'active',
      ])
      expect(result.rows[0].name).toBe('Test')
    })
  })

  describe('connect', () => {
    it('should throw when no pool is set', async () => {
      await expect(connect()).rejects.toThrow('Database pool not configured')
    })

    it('should call pool connect', async () => {
      const mockConnection: DatabaseConnection = {
        query: vi.fn(),
        release: vi.fn(),
      }
      const mockConnect = vi.fn().mockResolvedValue(mockConnection)
      const mockPool: DatabasePool = {
        query: vi.fn(),
        connect: mockConnect,
        end: vi.fn(),
      }
      setPool(mockPool)

      const result = await connect()

      expect(mockConnect).toHaveBeenCalled()
      expect(result).toBe(mockConnection)
    })
  })

  describe('end', () => {
    it('should throw when no pool is set', async () => {
      await expect(end()).rejects.toThrow('Database pool not configured')
    })

    it('should call pool end', async () => {
      const mockEnd = vi.fn().mockResolvedValue(undefined)
      const mockPool: DatabasePool = {
        query: vi.fn(),
        connect: vi.fn(),
        end: mockEnd,
      }
      setPool(mockPool)

      await end()

      expect(mockEnd).toHaveBeenCalled()
    })
  })
})

describe('database types', () => {
  it('should export QueryResult type', () => {
    const result: QueryResult<{ id: number }> = {
      rows: [{ id: 1 }, { id: 2 }],
      rowCount: 2,
      fields: [{ name: 'id', dataTypeID: 23 }],
    }
    expect(result.rows).toHaveLength(2)
    expect(result.rowCount).toBe(2)
  })

  it('should export DatabaseConnection type', () => {
    const connection: DatabaseConnection = {
      query: async <T>(_text: string, _values?: unknown[]): Promise<QueryResult<T>> => ({
        rows: [],
        rowCount: 0,
      }),
      release: () => {},
    }
    expect(typeof connection.query).toBe('function')
    expect(typeof connection.release).toBe('function')
  })

  it('should export DatabaseTransaction type', () => {
    const transaction: DatabaseTransaction = {
      query: async <T>(): Promise<QueryResult<T>> => ({ rows: [], rowCount: 0 }),
      release: () => {},
      commit: async () => {},
      rollback: async () => {},
    }
    expect(typeof transaction.commit).toBe('function')
    expect(typeof transaction.rollback).toBe('function')
  })

  it('should export DatabasePool type with required methods', () => {
    const pool: DatabasePool = {
      query: async <T>(): Promise<QueryResult<T>> => ({ rows: [], rowCount: 0 }),
      connect: async (): Promise<DatabaseConnection> => ({
        query: async () => ({ rows: [], rowCount: 0 }),
        release: () => {},
      }),
      end: async () => {},
    }
    expect(typeof pool.query).toBe('function')
    expect(typeof pool.connect).toBe('function')
    expect(typeof pool.end).toBe('function')
  })

  it('should export DatabasePool type with optional methods', () => {
    const pool: DatabasePool = {
      query: async <T>(): Promise<QueryResult<T>> => ({ rows: [], rowCount: 0 }),
      connect: async (): Promise<DatabaseConnection> => ({
        query: async () => ({ rows: [], rowCount: 0 }),
        release: () => {},
      }),
      end: async () => {},
      transaction: async (): Promise<DatabaseTransaction> => ({
        query: async () => ({ rows: [], rowCount: 0 }),
        release: () => {},
        commit: async () => {},
        rollback: async () => {},
      }),
      stats: () => ({ total: 10, idle: 5, waiting: 0 }),
    }
    expect(typeof pool.transaction).toBe('function')
    expect(typeof pool.stats).toBe('function')
  })

  it('should export DatabaseProvider type', () => {
    const provider: DatabaseProvider = {
      pool: {
        query: async () => ({ rows: [], rowCount: 0 }),
        connect: async () => ({
          query: async () => ({ rows: [], rowCount: 0 }),
          release: () => {},
        }),
        end: async () => {},
      },
      createPool: (_config: DatabaseConfig) => provider.pool,
    }
    expect(provider.pool).toBeDefined()
    expect(typeof provider.createPool).toBe('function')
  })

  it('should export DatabaseConfig type', () => {
    const config: DatabaseConfig = {
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      user: 'admin',
      password: 'secret',
      connectionString: 'postgres://admin:secret@localhost:5432/testdb',
      max: 20,
      min: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      ssl: {
        rejectUnauthorized: false,
        ca: 'cert-data',
      },
    }
    expect(config.host).toBe('localhost')
    expect(config.ssl).toBeDefined()
  })

  it('should export DatabaseConfig with boolean ssl', () => {
    const config: DatabaseConfig = {
      host: 'localhost',
      ssl: true,
    }
    expect(config.ssl).toBe(true)
  })
})
