/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual
 * `@molecule/api-database` bond wiring (`setStore`/`getStore` through the real
 * registry) with a REAL engine-faithful in-memory {@link DataStore}.
 *
 * The unit suite (`provider.test.ts`) mocks `@molecule/api-database`, so it can
 * only validate OUR assumptions about the DataStore contract — not the contract
 * itself. This file drives the provider end-to-end through the real bond
 * registry against a store that behaves like the string/number engines the
 * provider claims to normalise (SQLite/MySQL: booleans bind as 0/1, JSON
 * columns come back as raw TEXT), and pins the failure shapes a caller needs to
 * tell apart: "no DataStore bonded" (actionable setup error) vs "not yours /
 * not found" (false, no throw) vs a malformed stored JSON value (degrades to
 * `undefined`, never crashes the list).
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type {
  DataStore,
  FindManyOptions,
  MutationResult,
  WhereCondition,
} from '@molecule/api-database'
import { setStore } from '@molecule/api-database'
import type { NotificationCenterProvider } from '@molecule/api-notification-center'

import { createProvider } from '../provider.js'

/* ------------------------------------------------------------------ */
/*  A REAL in-memory DataStore, faithful to string/number engines       */
/* ------------------------------------------------------------------ */

/**
 * Binds a JS value the way real drivers do: booleans become 0/1 (SQLite and
 * MySQL have no boolean storage class), everything else passes through.
 */
function bindValue(value: unknown): unknown {
  if (typeof value === 'boolean') return value ? 1 : 0
  return value
}

/** Engine-faithful in-memory DataStore: stores bound values, returns raw rows. */
function makeEngineStore(options: { returnRowOnCreate?: boolean } = {}): DataStore & {
  tables: Map<string, Record<string, unknown>[]>
} {
  const returnRowOnCreate = options.returnRowOnCreate ?? true
  const tables = new Map<string, Record<string, unknown>[]>()

  function rows(table: string): Record<string, unknown>[] {
    let t = tables.get(table)
    if (!t) {
      t = []
      tables.set(table, t)
    }
    return t
  }

  function matches(row: Record<string, unknown>, where: WhereCondition[] = []): boolean {
    return where.every((cond) => {
      const actual = row[cond.field]
      const bound = bindValue(cond.value)
      switch (cond.operator) {
        case '=':
          return actual === bound
        case '!=':
          return actual !== bound
        case 'is_null':
          return actual == null
        case 'is_not_null':
          return actual != null
        case 'in':
          return Array.isArray(bound) && bound.map(bindValue).includes(actual)
        default:
          throw new Error(`engine store: operator ${cond.operator} not implemented`)
      }
    })
  }

  return {
    tables,
    async findById(table, id) {
      return (rows(table).find((r) => r.id === id) as never) ?? null
    },
    async findOne(table, where) {
      return (rows(table).find((r) => matches(r, where)) as never) ?? null
    },
    async findMany(table, opts: FindManyOptions = {}) {
      let result = rows(table).filter((r) => matches(r, opts.where))
      for (const order of [...(opts.orderBy ?? [])].reverse()) {
        result = [...result].sort((a, b) => {
          const av = a[order.field] as string
          const bv = b[order.field] as string
          const cmp = av < bv ? -1 : av > bv ? 1 : 0
          return order.direction === 'desc' ? -cmp : cmp
        })
      }
      const offset = opts.offset ?? 0
      const limit = opts.limit ?? result.length
      return result.slice(offset, offset + limit) as never
    },
    async count(table, where) {
      return rows(table).filter((r) => matches(r, where)).length
    },
    async create(table, data) {
      const stored: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(data)) stored[key] = bindValue(value)
      rows(table).push(stored)
      return { data: returnRowOnCreate ? stored : null, affected: 1 } as MutationResult<never>
    },
    async updateById(table, id, data) {
      const row = rows(table).find((r) => r.id === id)
      if (!row) return { data: null, affected: 0 }
      for (const [key, value] of Object.entries(data)) row[key] = bindValue(value)
      return { data: row, affected: 1 } as MutationResult<never>
    },
    async updateMany(table, where, data) {
      const matched = rows(table).filter((r) => matches(r, where))
      for (const row of matched) {
        for (const [key, value] of Object.entries(data)) row[key] = bindValue(value)
      }
      return { data: null, affected: matched.length }
    },
    async deleteById(table, id) {
      const t = rows(table)
      const index = t.findIndex((r) => r.id === id)
      if (index === -1) return { data: null, affected: 0 }
      t.splice(index, 1)
      return { data: null, affected: 1 }
    },
    async deleteMany(table, where) {
      const t = rows(table)
      const before = t.length
      const kept = t.filter((r) => !matches(r, where))
      t.length = 0
      t.push(...kept)
      return { data: null, affected: before - kept.length }
    },
  }
}

/* ------------------------------------------------------------------ */
/*  Tests (order matters: the unbonded assertion runs before setStore) */
/* ------------------------------------------------------------------ */

describe('@molecule/api-notification-center-database × REAL @molecule/api-database', () => {
  it('FAILURE DISAMBIGUATION: no DataStore bonded → the actionable setup error, not a crash inside the provider', async () => {
    // Runs FIRST (nothing bonded yet in this process). The executor-facing
    // failure must say how to fix the wiring — not surface as a broken bond
    // registry or a TypeError deep in this package.
    const provider = createProvider()
    await expect(provider.getAll('user-1')).rejects.toThrow(
      'DataStore not configured. Call setStore() first.',
    )
  })

  it('full lifecycle on a 0/1 + JSON-text engine: send → list → unread → markRead → markAllRead → delete', async () => {
    const store = makeEngineStore()
    setStore(store)
    const provider: NotificationCenterProvider = createProvider()

    const sent = await provider.send('user-a', {
      type: 'system',
      title: 'Welcome',
      body: 'Hello!',
      data: { source: 'signup' },
    })

    // CONSUMER PROPERTY: the engine stores read as 0 and data as JSON text —
    // consumers must still get a real boolean and a parsed object, on send()
    // AND on every read path. (A bare cast here typed a STRING as an object.)
    expect(sent.read).toBe(false)
    expect(typeof sent.read).toBe('boolean')
    expect(sent.data).toEqual({ source: 'signup' })
    expect(sent.createdAt).toBeInstanceOf(Date)
    expect(Number.isNaN(sent.createdAt.getTime())).toBe(false)
    // Proof the engine truly stored the raw forms the provider must normalise.
    const raw = store.tables.get('notifications')![0]
    expect(raw.read).toBe(0)
    expect(typeof raw.data).toBe('string')

    await provider.send('user-a', { type: 'alert', title: 'Disk full', body: '95% used' })
    await provider.send('user-b', { type: 'system', title: 'Other user', body: 'not yours' })

    // Listing is user-scoped and engine-normalised.
    const all = await provider.getAll('user-a')
    expect(all.total).toBe(2)
    expect(all.items).toHaveLength(2)
    expect(all.items.every((n) => n.userId === 'user-a')).toBe(true)
    expect(all.items.every((n) => typeof n.read === 'boolean')).toBe(true)
    // Newest-first ordering (non-increasing createdAt — same-ms ties allowed).
    for (let i = 1; i < all.items.length; i++) {
      expect(all.items[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
        all.items[i].createdAt.getTime(),
      )
    }

    // The read=false FILTER round-trips through the 0/1 engine too.
    const unreadOnly = await provider.getAll('user-a', { read: false })
    expect(unreadOnly.total).toBe(2)
    expect(await provider.getUnreadCount('user-a')).toBe(2)

    // markRead: owner succeeds…
    expect(await provider.markRead('user-a', sent.id)).toBe(true)
    expect(await provider.getUnreadCount('user-a')).toBe(1)
    const nowRead = await provider.getAll('user-a', { read: true })
    expect(nowRead.items.map((n) => n.id)).toEqual([sent.id])

    // markAllRead only touches the caller's rows.
    await provider.markAllRead('user-a')
    expect(await provider.getUnreadCount('user-a')).toBe(0)
    expect(await provider.getUnreadCount('user-b')).toBe(1)

    // delete: owner-scoped, reports whether anything matched.
    expect(await provider.delete('user-a', sent.id)).toBe(true)
    expect((await provider.getAll('user-a')).total).toBe(1)
  })

  it('FAILURE DISAMBIGUATION: another user probing your notification id gets false — same shape as "not found", never a mutation', async () => {
    const provider = createProvider()
    const mine = await provider.send('owner', { type: 'dm', title: 'Private', body: 'secret' })

    // A different user CANNOT mark it read or delete it — and can tell nothing
    // happened (false), distinct from success (true) and from a thrown error.
    expect(await provider.markRead('attacker', mine.id)).toBe(false)
    expect(await provider.delete('attacker', mine.id)).toBe(false)
    // Unknown id for the OWNER is the same false — id-probing is uninformative.
    expect(await provider.markRead('owner', 'no-such-id')).toBe(false)

    // The row is untouched.
    const fresh = await provider.getAll('owner', { type: 'dm' })
    expect(fresh.items).toHaveLength(1)
    expect(fresh.items[0].read).toBe(false)
  })

  it('CONSUMER PROPERTY: an engine without RETURNING (create → data:null) still yields a complete Notification', async () => {
    // MySQL-style INSERT returns no row; the provider must synthesise the
    // notification it just wrote instead of handing back undefined fields.
    setStore(makeEngineStore({ returnRowOnCreate: false }))
    const provider = createProvider()
    const sent = await provider.send('user-c', {
      type: 'system',
      title: 'No returning',
      body: 'still complete',
      data: { n: 1 },
    })
    expect(sent.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(sent.userId).toBe('user-c')
    expect(sent.title).toBe('No returning')
    expect(sent.read).toBe(false)
    expect(sent.data).toEqual({ n: 1 })
    expect(sent.createdAt).toBeInstanceOf(Date)

    // …and the row it wrote is really there for later reads.
    const listed = await provider.getAll('user-c')
    expect(listed.items.map((n) => n.title)).toEqual(['No returning'])
  })

  it('CONSUMER PROPERTY: malformed stored JSON degrades to undefined data — one bad row must not crash every list', async () => {
    const store = makeEngineStore()
    setStore(store)
    const provider = createProvider()
    await provider.send('user-d', { type: 'ok', title: 'Fine', body: 'good row' })
    // A row corrupted outside the provider (migration, manual edit).
    store.tables.get('notifications')!.push({
      id: 'corrupt-1',
      user_id: 'user-d',
      type: 'ok',
      title: 'Corrupt',
      body: 'bad json',
      read: 0,
      data: '{not json',
      created_at: new Date().toISOString(),
    })

    const all = await provider.getAll('user-d')
    expect(all.total).toBe(2)
    const corrupt = all.items.find((n) => n.id === 'corrupt-1')
    expect(corrupt).toBeDefined()
    expect(corrupt!.data).toBeUndefined()
  })

  it('preferences: defaults are isolated per caller, set/partial-update round-trips through the 0/1 engine', async () => {
    const store = makeEngineStore()
    setStore(store)
    const provider = createProvider()

    // Defaults for a user with no row — engine-normalised real booleans.
    const defaults = await provider.getPreferences('user-e')
    expect(defaults).toEqual({ email: true, push: true, sms: false, channels: {} })

    // CONSUMER PROPERTY: mutating one caller's result must not pollute the
    // defaults handed to the next caller (the shared-reference trap).
    defaults.channels.marketing = false
    defaults.email = false
    const fresh = await provider.getPreferences('user-f')
    expect(fresh.channels).toEqual({})
    expect(fresh.email).toBe(true)

    // First set creates the row (unset fields fall back to defaults)…
    await provider.setPreferences('user-e', { sms: true, channels: { digest: true } })
    const afterSet = await provider.getPreferences('user-e')
    expect(afterSet).toEqual({ email: true, push: true, sms: true, channels: { digest: true } })
    // …and the engine really stored 0/1 + JSON text, not JS types.
    const rawPrefs = store.tables.get('notification_preferences')![0]
    expect(rawPrefs.sms).toBe(1)
    expect(typeof rawPrefs.channels).toBe('string')

    // Partial update touches ONLY the provided fields.
    await provider.setPreferences('user-e', { email: false })
    const afterPartial = await provider.getPreferences('user-e')
    expect(afterPartial).toEqual({
      email: false,
      push: true,
      sms: true,
      channels: { digest: true },
    })
  })

  it('honors custom table names end-to-end', async () => {
    const store = makeEngineStore()
    setStore(store)
    const provider = createProvider({
      tableName: 'user_notifications',
      preferencesTableName: 'user_notification_prefs',
    })
    await provider.send('user-g', { type: 'system', title: 'Custom', body: 'tables' })
    await provider.setPreferences('user-g', { push: false })

    expect(store.tables.has('user_notifications')).toBe(true)
    expect(store.tables.has('user_notification_prefs')).toBe(true)
    expect(store.tables.has('notifications')).toBe(false)
    expect((await provider.getAll('user-g')).total).toBe(1)
  })
})
