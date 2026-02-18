/**
 * Comprehensive tests for `@molecule/api-testing`
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DeviceFixture, SessionFixture, UserFixture } from '../fixtures/index.js'
// Import fixtures
import {
  createDeviceFixture,
  createMany,
  createSessionFixture,
  createUserFixture,
} from '../fixtures/index.js'
// Import helpers
import {
  createDeferred,
  createSpy,
  expectThrows,
  randomEmail,
  randomString,
  randomUUID,
  wait,
  waitFor,
} from '../helpers/index.js'
// Import mocks
import {
  createMockCache,
  createMockDatabase,
  createMockEmail,
  createMockLogger,
  createMockQueue,
  mockCache,
  mockDatabase,
  mockEmail,
  mockLogger,
  mockQueue,
} from '../mocks/index.js'
import type { LogEntry } from '../mocks/logger.js'

// ============================================================================
// Mock Database Tests
// ============================================================================

describe('Mock Database', () => {
  describe('createMockDatabase', () => {
    let db: ReturnType<typeof createMockDatabase>

    beforeEach(() => {
      db = createMockDatabase()
    })

    describe('query', () => {
      it('should track queries', async () => {
        await db.query('SELECT * FROM users WHERE id = $1', ['123'])

        expect(db.queries).toHaveLength(1)
        expect(db.queries[0]).toEqual({
          text: 'SELECT * FROM users WHERE id = $1',
          values: ['123'],
        })
      })

      it('should return the configured result', async () => {
        const expectedRows = [{ id: '1', name: 'Test' }]
        db.setQueryResult({ rows: expectedRows, rowCount: 1 })

        const result = await db.query<{ id: string; name: string }>('SELECT * FROM users')

        expect(result.rows).toEqual(expectedRows)
        expect(result.rowCount).toBe(1)
      })

      it('should return empty results by default', async () => {
        const result = await db.query('SELECT * FROM users')

        expect(result.rows).toEqual([])
        expect(result.rowCount).toBe(0)
      })
    })

    describe('reset', () => {
      it('should clear queries and reset result', async () => {
        db.setQueryResult({ rows: [{ id: '1' }], rowCount: 1 })
        await db.query('SELECT 1')

        db.reset()

        expect(db.queries).toHaveLength(0)
        const result = await db.query('SELECT 1')
        expect(result.rows).toEqual([])
      })
    })

    describe('connect', () => {
      it('should return a connection that tracks queries', async () => {
        const conn = await db.connect()

        await conn.query('INSERT INTO users VALUES ($1)', ['test'])
        conn.release()

        expect(db.queries).toHaveLength(1)
      })
    })

    describe('transaction', () => {
      it('should return a transaction with commit and rollback', async () => {
        const tx = await db.transaction()

        await tx.query('INSERT INTO users VALUES ($1)', ['test'])
        await tx.commit()

        expect(db.queries).toHaveLength(1)
      })

      it('should support rollback', async () => {
        const tx = await db.transaction()

        await tx.query('INSERT INTO users VALUES ($1)', ['test'])
        await tx.rollback()

        expect(db.queries).toHaveLength(1)
      })
    })

    describe('stats', () => {
      it('should return pool stats', () => {
        const stats = db.stats()

        expect(stats).toEqual({ total: 1, idle: 1, waiting: 0 })
      })
    })

    describe('end', () => {
      it('should resolve without error', async () => {
        await expect(db.end()).resolves.toBeUndefined()
      })
    })
  })

  describe('mockDatabase singleton', () => {
    beforeEach(() => {
      mockDatabase.reset()
    })

    it('should be a pre-configured instance', async () => {
      await mockDatabase.query('SELECT 1')
      expect(mockDatabase.queries).toHaveLength(1)
    })
  })
})

// ============================================================================
// Mock Cache Tests
// ============================================================================

describe('Mock Cache', () => {
  describe('createMockCache', () => {
    let cache: ReturnType<typeof createMockCache>

    beforeEach(() => {
      cache = createMockCache()
    })

    describe('get/set', () => {
      it('should store and retrieve values', async () => {
        await cache.set('key1', { value: 'test' })

        const result = await cache.get<{ value: string }>('key1')

        expect(result).toEqual({ value: 'test' })
      })

      it('should return undefined for missing keys', async () => {
        const result = await cache.get('nonexistent')

        expect(result).toBeUndefined()
      })

      it('should expose store for inspection', async () => {
        await cache.set('key1', 'value1')

        expect(cache.store.size).toBe(1)
        expect(cache.store.get('key1')?.value).toBe('value1')
      })
    })

    describe('has', () => {
      it('should return true for existing keys', async () => {
        await cache.set('key1', 'value')

        expect(await cache.has('key1')).toBe(true)
      })

      it('should return false for missing keys', async () => {
        expect(await cache.has('nonexistent')).toBe(false)
      })
    })

    describe('delete', () => {
      it('should remove existing keys', async () => {
        await cache.set('key1', 'value')

        const deleted = await cache.delete('key1')

        expect(deleted).toBe(true)
        expect(await cache.has('key1')).toBe(false)
      })

      it('should return false for missing keys', async () => {
        const deleted = await cache.delete('nonexistent')

        expect(deleted).toBe(false)
      })
    })

    describe('getMany/setMany', () => {
      it('should handle batch operations', async () => {
        await cache.setMany([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ])

        const results = await cache.getMany<string>(['key1', 'key2', 'key3'])

        expect(results.size).toBe(2)
        expect(results.get('key1')).toBe('value1')
        expect(results.get('key2')).toBe('value2')
        expect(results.has('key3')).toBe(false)
      })
    })

    describe('deleteMany', () => {
      it('should delete multiple keys', async () => {
        await cache.setMany([
          ['key1', 'value1'],
          ['key2', 'value2'],
          ['key3', 'value3'],
        ])

        const count = await cache.deleteMany(['key1', 'key2', 'key4'])

        expect(count).toBe(2)
        expect(await cache.has('key3')).toBe(true)
      })
    })

    describe('tags and invalidation', () => {
      it('should track tags on set', async () => {
        await cache.set('user:1', { name: 'Test' }, { tags: ['users'] })
        await cache.set('user:2', { name: 'Test2' }, { tags: ['users'] })
        await cache.set('other', { name: 'Other' })

        expect(cache.store.get('user:1')?.tags).toEqual(['users'])
      })

      it('should invalidate by tag', async () => {
        await cache.set('user:1', { name: 'Test' }, { tags: ['users'] })
        await cache.set('user:2', { name: 'Test2' }, { tags: ['users'] })
        await cache.set('other', { name: 'Other' })

        await cache.invalidateTag('users')

        expect(await cache.has('user:1')).toBe(false)
        expect(await cache.has('user:2')).toBe(false)
        expect(await cache.has('other')).toBe(true)
      })
    })

    describe('clear', () => {
      it('should remove all entries', async () => {
        await cache.setMany([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ])

        await cache.clear()

        expect(cache.store.size).toBe(0)
      })
    })

    describe('getOrSet', () => {
      it('should return cached value if exists', async () => {
        await cache.set('key1', 'cached')
        const factory = vi.fn().mockResolvedValue('fresh')

        const result = await cache.getOrSet('key1', factory)

        expect(result).toBe('cached')
        expect(factory).not.toHaveBeenCalled()
      })

      it('should call factory and cache if not exists', async () => {
        const factory = vi.fn().mockResolvedValue('fresh')

        const result = await cache.getOrSet('key1', factory)

        expect(result).toBe('fresh')
        expect(factory).toHaveBeenCalledOnce()
        expect(await cache.get('key1')).toBe('fresh')
      })
    })

    describe('reset', () => {
      it('should clear all state', async () => {
        await cache.set('key1', 'value1', { tags: ['tag1'] })

        cache.reset()

        expect(cache.store.size).toBe(0)
      })
    })

    describe('close', () => {
      it('should resolve without error', async () => {
        await expect(cache.close()).resolves.toBeUndefined()
      })
    })
  })

  describe('mockCache singleton', () => {
    beforeEach(() => {
      mockCache.reset()
    })

    it('should be a pre-configured instance', async () => {
      await mockCache.set('test', 'value')
      expect(await mockCache.get('test')).toBe('value')
    })
  })
})

// ============================================================================
// Mock Queue Tests
// ============================================================================

describe('Mock Queue', () => {
  describe('createMockQueue', () => {
    let queue: ReturnType<typeof createMockQueue>

    beforeEach(() => {
      queue = createMockQueue()
    })

    describe('queue', () => {
      it('should create and return queues lazily', () => {
        const q1 = queue.queue('test-queue')
        const q2 = queue.queue('test-queue')

        expect(q1).toBe(q2)
        expect(queue.queues.size).toBe(1)
      })
    })

    describe('send/receive', () => {
      it('should send messages to a queue', async () => {
        const q = queue.queue('test-queue')

        const id = await q.send({ body: { type: 'test', data: 123 } })

        expect(id).toBeDefined()
        expect(q.messages).toHaveLength(1)
        expect(q.messages[0].body).toEqual({ type: 'test', data: 123 })
      })

      it('should receive messages from a queue', async () => {
        const q = queue.queue('test-queue')
        await q.send({ body: 'message1' })
        await q.send({ body: 'message2' })

        const messages = await q.receive<string>()

        expect(messages).toHaveLength(2)
        expect(messages[0].body).toBe('message1')
        expect(messages[1].body).toBe('message2')
      })

      it('should respect maxMessages option', async () => {
        const q = queue.queue('test-queue')
        await q.send({ body: 'message1' })
        await q.send({ body: 'message2' })
        await q.send({ body: 'message3' })

        const messages = await q.receive({ maxMessages: 2 })

        expect(messages).toHaveLength(2)
      })

      it('should acknowledge messages', async () => {
        const q = queue.queue('test-queue')
        await q.send({ body: 'message1' })

        const [msg] = await q.receive<string>()
        await msg.ack()

        expect(q.messages).toHaveLength(0)
      })

      it('should use provided message id', async () => {
        const q = queue.queue('test-queue')

        const id = await q.send({ id: 'custom-id', body: 'test' })

        expect(id).toBe('custom-id')
      })
    })

    describe('sendBatch', () => {
      it('should send multiple messages', async () => {
        const q = queue.queue('test-queue')

        const ids = await q.sendBatch([{ body: 'msg1' }, { body: 'msg2' }])

        expect(ids).toHaveLength(2)
        expect(q.messages).toHaveLength(2)
      })
    })

    describe('subscribe', () => {
      it('should notify subscribers on new messages', async () => {
        const q = queue.queue('test-queue')
        const received: unknown[] = []

        q.subscribe<string>((msg) => {
          received.push(msg.body)
        })

        await q.send({ body: 'test-message' })

        // Wait for setImmediate
        await wait(10)

        expect(received).toEqual(['test-message'])
      })

      it('should return unsubscribe function', async () => {
        const q = queue.queue('test-queue')
        const received: unknown[] = []

        const unsubscribe = q.subscribe<string>((msg) => {
          received.push(msg.body)
        })

        unsubscribe()

        await q.send({ body: 'test-message' })
        await wait(10)

        expect(received).toEqual([])
      })
    })

    describe('size', () => {
      it('should return message count', async () => {
        const q = queue.queue('test-queue')
        await q.send({ body: 'msg1' })
        await q.send({ body: 'msg2' })

        expect(await q.size()).toBe(2)
      })
    })

    describe('purge', () => {
      it('should remove all messages', async () => {
        const q = queue.queue('test-queue')
        await q.send({ body: 'msg1' })
        await q.send({ body: 'msg2' })

        await q.purge()

        expect(q.messages).toHaveLength(0)
      })
    })

    describe('listQueues', () => {
      it('should list all queue names', async () => {
        queue.queue('queue1')
        queue.queue('queue2')

        const names = await queue.listQueues()

        expect(names).toEqual(['queue1', 'queue2'])
      })
    })

    describe('createQueue', () => {
      it('should create a new queue', async () => {
        const q = await queue.createQueue('new-queue')

        expect(q.name).toBe('new-queue')
        expect(queue.queues.has('new-queue')).toBe(true)
      })
    })

    describe('deleteQueue', () => {
      it('should remove a queue', async () => {
        queue.queue('to-delete')

        await queue.deleteQueue('to-delete')

        expect(queue.queues.has('to-delete')).toBe(false)
      })
    })

    describe('reset', () => {
      it('should clear all queues', async () => {
        queue.queue('queue1')
        queue.queue('queue2')

        queue.reset()

        expect(queue.queues.size).toBe(0)
      })
    })

    describe('close', () => {
      it('should resolve without error', async () => {
        await expect(queue.close()).resolves.toBeUndefined()
      })
    })
  })

  describe('mockQueue singleton', () => {
    beforeEach(() => {
      mockQueue.reset()
    })

    it('should be a pre-configured instance', async () => {
      const q = mockQueue.queue('test')
      await q.send({ body: 'test' })
      expect(mockQueue.queues.size).toBe(1)
    })
  })
})

// ============================================================================
// Mock Email Tests
// ============================================================================

describe('Mock Email', () => {
  describe('createMockEmail', () => {
    let email: ReturnType<typeof createMockEmail>

    beforeEach(() => {
      email = createMockEmail()
    })

    describe('sendMail', () => {
      it('should track sent messages', async () => {
        const message = {
          to: 'user@test.com',
          from: 'noreply@test.com',
          subject: 'Test Subject',
          text: 'Test body',
        }

        await email.sendMail(message)

        expect(email.sentMessages).toHaveLength(1)
        expect(email.sentMessages[0]).toEqual(message)
      })

      it('should return accepted recipients', async () => {
        const result = await email.sendMail({
          to: ['user1@test.com', 'user2@test.com'],
          from: 'noreply@test.com',
          subject: 'Test',
          text: 'Body',
        })

        expect(result.accepted).toEqual(['user1@test.com', 'user2@test.com'])
        expect(result.rejected).toEqual([])
        expect(result.messageId).toMatch(/^mock-/)
        expect(result.response).toBe('OK')
      })

      it('should handle single recipient', async () => {
        const result = await email.sendMail({
          to: 'user@test.com',
          from: 'noreply@test.com',
          subject: 'Test',
          text: 'Body',
        })

        expect(result.accepted).toEqual(['user@test.com'])
      })
    })

    describe('failNext', () => {
      it('should make next send fail', async () => {
        const error = new Error('SMTP error')
        email.failNext(error)

        await expect(
          email.sendMail({
            to: 'user@test.com',
            from: 'noreply@test.com',
            subject: 'Test',
            text: 'Body',
          }),
        ).rejects.toThrow('SMTP error')
      })

      it('should only fail once', async () => {
        email.failNext(new Error('SMTP error'))

        // First call fails
        await expect(
          email.sendMail({
            to: 'user@test.com',
            from: 'noreply@test.com',
            subject: 'Test',
            text: 'Body',
          }),
        ).rejects.toThrow()

        // Second call succeeds
        const result = await email.sendMail({
          to: 'user@test.com',
          from: 'noreply@test.com',
          subject: 'Test',
          text: 'Body',
        })

        expect(result.response).toBe('OK')
      })
    })

    describe('reset', () => {
      it('should clear sent messages and error state', async () => {
        await email.sendMail({
          to: 'user@test.com',
          from: 'noreply@test.com',
          subject: 'Test',
          text: 'Body',
        })
        email.failNext(new Error('test'))

        email.reset()

        expect(email.sentMessages).toHaveLength(0)
        // Should not throw since error was cleared
        await expect(
          email.sendMail({
            to: 'user@test.com',
            from: 'noreply@test.com',
            subject: 'Test',
            text: 'Body',
          }),
        ).resolves.toBeDefined()
      })
    })
  })

  describe('mockEmail singleton', () => {
    beforeEach(() => {
      mockEmail.reset()
    })

    it('should be a pre-configured instance', async () => {
      await mockEmail.sendMail({
        to: 'user@test.com',
        from: 'noreply@test.com',
        subject: 'Test',
        text: 'Body',
      })
      expect(mockEmail.sentMessages).toHaveLength(1)
    })
  })
})

// ============================================================================
// Mock Logger Tests
// ============================================================================

describe('Mock Logger', () => {
  describe('createMockLogger', () => {
    let logger: ReturnType<typeof createMockLogger>

    beforeEach(() => {
      logger = createMockLogger()
    })

    describe('logging methods', () => {
      it('should capture trace logs', () => {
        logger.trace('trace message', { data: 1 })

        expect(logger.logs).toHaveLength(1)
        expect(logger.logs[0]).toMatchObject({
          level: 'trace',
          message: 'trace message',
          args: [{ data: 1 }],
        })
        expect(logger.logs[0].timestamp).toBeInstanceOf(Date)
      })

      it('should capture debug logs', () => {
        logger.debug('debug message')

        expect(logger.logs[0].level).toBe('debug')
      })

      it('should capture info logs', () => {
        logger.info('info message')

        expect(logger.logs[0].level).toBe('info')
      })

      it('should capture warn logs', () => {
        logger.warn('warn message')

        expect(logger.logs[0].level).toBe('warn')
      })

      it('should capture error logs', () => {
        logger.error('error message', new Error('test'))

        expect(logger.logs[0].level).toBe('error')
        expect(logger.logs[0].args[0]).toBeInstanceOf(Error)
      })
    })

    describe('getLogsByLevel', () => {
      it('should filter logs by level', () => {
        logger.info('info 1')
        logger.error('error 1')
        logger.info('info 2')
        logger.warn('warn 1')

        const infoLogs = logger.getLogsByLevel('info')
        const errorLogs = logger.getLogsByLevel('error')

        expect(infoLogs).toHaveLength(2)
        expect(errorLogs).toHaveLength(1)
      })
    })

    describe('reset', () => {
      it('should clear all logs', () => {
        logger.info('test')
        logger.error('test')

        logger.reset()

        expect(logger.logs).toHaveLength(0)
      })
    })

    describe('setLevel/getLevel', () => {
      it('should return trace as default level', () => {
        expect(logger.getLevel()).toBe('trace')
      })

      it('should accept setLevel calls without error', () => {
        expect(() => logger.setLevel()).not.toThrow()
      })
    })
  })

  describe('mockLogger singleton', () => {
    beforeEach(() => {
      mockLogger.reset()
    })

    it('should be a pre-configured instance', () => {
      mockLogger.info('test')
      expect(mockLogger.logs).toHaveLength(1)
    })
  })
})

// ============================================================================
// Helper Tests
// ============================================================================

describe('Helpers', () => {
  describe('wait', () => {
    it('should wait for specified milliseconds', async () => {
      const start = Date.now()

      await wait(50)

      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(40) // Allow some variance
    })
  })

  describe('waitFor', () => {
    it('should resolve when condition becomes true', async () => {
      let value = false
      setTimeout(() => {
        value = true
      }, 50)

      await waitFor(() => value, { timeout: 1000, interval: 10 })

      expect(value).toBe(true)
    })

    it('should support async conditions', async () => {
      let value = false
      setTimeout(() => {
        value = true
      }, 50)

      await waitFor(async () => value, { timeout: 1000, interval: 10 })

      expect(value).toBe(true)
    })

    it('should throw on timeout', async () => {
      await expect(waitFor(() => false, { timeout: 50, interval: 10 })).rejects.toThrow(
        'waitFor timed out after 50ms',
      )
    })

    it('should use default timeout and interval', async () => {
      let value = false
      setTimeout(() => {
        value = true
      }, 10)

      await waitFor(() => value)

      expect(value).toBe(true)
    })
  })

  describe('createDeferred', () => {
    it('should create a deferred promise', () => {
      const deferred = createDeferred<string>()

      expect(deferred.promise).toBeInstanceOf(Promise)
      expect(typeof deferred.resolve).toBe('function')
      expect(typeof deferred.reject).toBe('function')
    })

    it('should resolve externally', async () => {
      const deferred = createDeferred<string>()

      deferred.resolve('success')

      await expect(deferred.promise).resolves.toBe('success')
    })

    it('should reject externally', async () => {
      const deferred = createDeferred<string>()

      deferred.reject(new Error('failure'))

      await expect(deferred.promise).rejects.toThrow('failure')
    })
  })

  describe('expectThrows', () => {
    it('should return error when function throws', async () => {
      const error = await expectThrows(() => {
        throw new Error('test error')
      })

      expect(error.message).toBe('test error')
    })

    it('should work with async functions', async () => {
      const error = await expectThrows(async () => {
        throw new Error('async error')
      })

      expect(error.message).toBe('async error')
    })

    it('should throw when function does not throw', async () => {
      await expect(expectThrows(() => 'no error')).rejects.toThrow('Expected function to throw')
    })

    it('should check error type', async () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'CustomError'
        }
      }

      const error = await expectThrows(() => {
        throw new CustomError('custom')
      }, CustomError)

      expect(error).toBeInstanceOf(CustomError)
    })

    it('should throw when error type does not match', async () => {
      class CustomError extends Error {}
      class OtherError extends Error {}

      await expect(
        expectThrows(() => {
          throw new OtherError('other')
        }, CustomError),
      ).rejects.toThrow('Expected error of type CustomError')
    })
  })

  describe('createSpy', () => {
    it('should create a callable spy', () => {
      const spy = createSpy()

      spy('arg1', 'arg2')

      expect(spy.callCount).toBe(1)
      expect(spy.calls[0].args).toEqual(['arg1', 'arg2'])
    })

    it('should call the implementation', () => {
      const spy = createSpy((a: number, b: number) => a + b)

      const result = spy(2, 3)

      expect(result).toBe(5)
      expect(spy.calls[0].result).toBe(5)
    })

    it('should track multiple calls', () => {
      const spy = createSpy()

      spy('call1')
      spy('call2')
      spy('call3')

      expect(spy.callCount).toBe(3)
      expect(spy.calls).toHaveLength(3)
    })

    it('should reset calls', () => {
      const spy = createSpy()

      spy('call1')
      spy.reset()

      expect(spy.callCount).toBe(0)
      expect(spy.calls).toHaveLength(0)
    })
  })

  describe('randomString', () => {
    it('should generate string of specified length', () => {
      const str = randomString(20)

      expect(str).toHaveLength(20)
    })

    it('should use default length of 10', () => {
      const str = randomString()

      expect(str).toHaveLength(10)
    })

    it('should only contain alphanumeric characters', () => {
      const str = randomString(100)

      expect(str).toMatch(/^[a-zA-Z0-9]+$/)
    })

    it('should generate different strings', () => {
      const str1 = randomString()
      const str2 = randomString()

      expect(str1).not.toBe(str2)
    })
  })

  describe('randomEmail', () => {
    it('should generate valid email format', () => {
      const email = randomEmail()

      expect(email).toMatch(/^[a-zA-Z0-9]+@test\.molecule\.dev$/)
    })

    it('should generate different emails', () => {
      const email1 = randomEmail()
      const email2 = randomEmail()

      expect(email1).not.toBe(email2)
    })
  })

  describe('randomUUID', () => {
    it('should generate valid UUID format', () => {
      const uuid = randomUUID()

      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })

    it('should generate different UUIDs', () => {
      const uuid1 = randomUUID()
      const uuid2 = randomUUID()

      expect(uuid1).not.toBe(uuid2)
    })
  })
})

// ============================================================================
// Fixture Tests
// ============================================================================

describe('Fixtures', () => {
  describe('createUserFixture', () => {
    it('should create a user with defaults', () => {
      const user = createUserFixture()

      expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      expect(user.username).toMatch(/^user_[a-z0-9]+$/)
      expect(user.email).toMatch(/@test\.molecule\.dev$/)
      expect(user.name).toBeNull()
      expect(user.createdAt).toBeDefined()
      expect(user.updatedAt).toBeDefined()
    })

    it('should allow overriding properties', () => {
      const user = createUserFixture({
        id: 'custom-id',
        username: 'custom-user',
        email: 'custom@example.com',
        name: 'Custom Name',
      })

      expect(user.id).toBe('custom-id')
      expect(user.username).toBe('custom-user')
      expect(user.email).toBe('custom@example.com')
      expect(user.name).toBe('Custom Name')
    })

    it('should allow overriding timestamps', () => {
      const customDate = '2024-01-01T00:00:00.000Z'
      const user = createUserFixture({
        createdAt: customDate,
        updatedAt: customDate,
      })

      expect(user.createdAt).toBe(customDate)
      expect(user.updatedAt).toBe(customDate)
    })
  })

  describe('createDeviceFixture', () => {
    it('should create a device with defaults', () => {
      const device = createDeviceFixture()

      expect(device.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      expect(device.userId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
      expect(device.platform).toBe('web')
      expect(device.createdAt).toBeDefined()
      expect(device.updatedAt).toBeDefined()
    })

    it('should allow overriding properties', () => {
      const device = createDeviceFixture({
        id: 'device-123',
        userId: 'user-456',
        platform: 'ios',
      })

      expect(device.id).toBe('device-123')
      expect(device.userId).toBe('user-456')
      expect(device.platform).toBe('ios')
    })
  })

  describe('createSessionFixture', () => {
    it('should create a session with defaults', () => {
      const session = createSessionFixture()

      expect(session.userId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
      expect(session.deviceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
      expect(session.token).toMatch(/^test_token_/)
      expect(session.expiresAt).toBeDefined()
    })

    it('should set expiration 7 days in the future by default', () => {
      const session = createSessionFixture()
      const expiresAt = new Date(session.expiresAt)
      const now = new Date()
      const diffDays = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      expect(diffDays).toBeGreaterThanOrEqual(6)
      expect(diffDays).toBeLessThanOrEqual(7)
    })

    it('should allow overriding properties', () => {
      const session = createSessionFixture({
        userId: 'user-123',
        deviceId: 'device-456',
        token: 'custom-token',
        expiresAt: '2025-12-31T23:59:59.999Z',
      })

      expect(session.userId).toBe('user-123')
      expect(session.deviceId).toBe('device-456')
      expect(session.token).toBe('custom-token')
      expect(session.expiresAt).toBe('2025-12-31T23:59:59.999Z')
    })
  })

  describe('createMany', () => {
    it('should create multiple fixtures', () => {
      const users = createMany(createUserFixture, 5)

      expect(users).toHaveLength(5)
      users.forEach((user) => {
        expect(user.id).toBeDefined()
        expect(user.username).toBeDefined()
      })
    })

    it('should pass index to factory', () => {
      const items = createMany((i) => ({ index: i, value: `item-${i}` }), 3)

      expect(items).toEqual([
        { index: 0, value: 'item-0' },
        { index: 1, value: 'item-1' },
        { index: 2, value: 'item-2' },
      ])
    })

    it('should work with custom factories', () => {
      const devices = createMany(
        (i) => createDeviceFixture({ platform: i % 2 === 0 ? 'ios' : 'android' }),
        4,
      )

      expect(devices[0].platform).toBe('ios')
      expect(devices[1].platform).toBe('android')
      expect(devices[2].platform).toBe('ios')
      expect(devices[3].platform).toBe('android')
    })

    it('should return empty array for count 0', () => {
      const items = createMany(() => ({}), 0)

      expect(items).toEqual([])
    })
  })
})

// ============================================================================
// Type Export Tests
// ============================================================================

describe('Type Exports', () => {
  it('should export LogEntry type', () => {
    const entry: LogEntry = {
      level: 'info',
      message: 'test',
      args: [],
      timestamp: new Date(),
    }
    expect(entry.level).toBe('info')
  })

  it('should export fixture types', () => {
    const user: UserFixture = createUserFixture()
    const device: DeviceFixture = createDeviceFixture()
    const session: SessionFixture = createSessionFixture()

    expect(user).toBeDefined()
    expect(device).toBeDefined()
    expect(session).toBeDefined()
  })
})
