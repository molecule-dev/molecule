/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — through the database bond on a real
 * SQLite file in a temp dir (no mocks: better-sqlite3 runs in-process).
 *
 * @module
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { setStore } from '@molecule/api-database'
import { createMigrator, pool, store } from '@molecule/api-database-sqlite'
import { createProvider } from '@molecule/api-notification-center-database'

import { getAll, getUnreadCount, markRead, send, setProvider } from '../index.js'

describe('README @example', () => {
  const originalCwd = process.cwd()
  const originalPath = process.env.SQLITE_PATH
  let root = ''

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'notification-center-readme-'))
    await mkdir(join(root, 'migrations'))
    await writeFile(
      join(root, 'migrations/001_notifications.sql'),
      `CREATE TABLE IF NOT EXISTS "notifications" (
        "id" text PRIMARY KEY,
        "user_id" text NOT NULL,
        "type" text NOT NULL,
        "title" text NOT NULL,
        "body" text NOT NULL,
        "read" boolean NOT NULL DEFAULT false,
        "data" text,
        "channels" text,
        "created_at" timestamp NOT NULL
      );
      CREATE TABLE IF NOT EXISTS "notification_preferences" (
        "id" text PRIMARY KEY,
        "user_id" text NOT NULL UNIQUE,
        "email" boolean NOT NULL DEFAULT true,
        "push" boolean NOT NULL DEFAULT true,
        "sms" boolean NOT NULL DEFAULT false,
        "channels" text
      );`,
    )
    process.chdir(root)
    process.env.SQLITE_PATH = join(root, 'data/app.db')
  })

  afterAll(async () => {
    await pool.end()
    process.chdir(originalCwd)
    if (originalPath === undefined) delete process.env.SQLITE_PATH
    else process.env.SQLITE_PATH = originalPath
    vi.restoreAllMocks()
    await rm(root, { recursive: true, force: true })
  })

  it('migrates, bonds store + provider, sends, lists unread, and marks read owner-scoped', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)

    await createMigrator(join(process.cwd(), 'migrations'))()
    setStore(store)
    setProvider(createProvider())

    const userId = 'user-123'
    const notification = await send(userId, {
      type: 'system',
      title: 'Welcome!',
      body: 'Your account is ready.',
      data: { href: '/settings' },
    })
    expect(notification.read).toBe(false)
    expect(notification.data).toEqual({ href: '/settings' })

    const { items, total } = await getAll(userId, { read: false, limit: 20 })
    expect(total).toBe(1)
    expect(items.map((item) => item.title)).toEqual(['Welcome!'])
    expect(await getUnreadCount(userId)).toBe(1)

    // Another user cannot mark it read.
    expect(await markRead('user-999', notification.id)).toBe(false)
    expect(await markRead(userId, notification.id)).toBe(true)
    expect(await getUnreadCount(userId)).toBe(0)
  })
})
