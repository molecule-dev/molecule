/**
 * Database-backed implementation of the molecule NotificationCenterProvider.
 *
 * Uses the bonded `@molecule/api-database` DataStore for all persistence,
 * making it agnostic to the underlying database engine.
 *
 * @module
 */

import { randomUUID } from 'node:crypto'

import type { FindManyOptions, WhereCondition } from '@molecule/api-database'
import { getStore } from '@molecule/api-database'
import type {
  BulkNotification,
  CreateNotification,
  Notification,
  NotificationCenterProvider,
  NotificationPreferences,
  NotificationQuery,
  PaginatedResult,
} from '@molecule/api-notification-center'

import type { DatabaseNotificationCenterConfig } from './types.js'

/** Default notification preferences for new users. */
const DEFAULT_PREFERENCES: NotificationPreferences = {
  email: true,
  push: true,
  sms: false,
  channels: {},
}

/**
 * Parses a JSON column value that may come back from the DataStore either
 * already parsed (Postgres `jsonb`) or as the raw stored string (SQLite /
 * MySQL TEXT). A bare type-cast here would hand consumers a STRING typed as
 * an object on string-storing engines.
 *
 * @param value - The raw column value.
 * @returns The parsed object, or `undefined` when null/absent/unparsable.
 */
function parseJsonColumn(value: unknown): Record<string, unknown> | undefined {
  if (value == null) return undefined
  if (typeof value === 'object') return value as Record<string, unknown>
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : undefined
    } catch (_error) {
      // A malformed stored value degrades to "no data" rather than crashing
      // every list/read of the notification that carries it.
      return undefined
    }
  }
  return undefined
}

/**
 * Maps a database row to a `Notification` object.
 *
 * Normalises engine differences: SQLite/MySQL return booleans as 0/1 and
 * JSON columns as strings, Postgres returns real booleans and parsed jsonb.
 *
 * @param row - The raw database row.
 * @returns The normalised notification.
 */
function toNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as string,
    title: row.title as string,
    body: row.body as string,
    read: Boolean(row.read),
    data: parseJsonColumn(row.data),
    createdAt: new Date(row.created_at as string),
  }
}

/**
 * Creates a database-backed {@link NotificationCenterProvider}.
 *
 * Requires a DataStore to be bonded via `@molecule/api-database` before use.
 *
 * @param config - Database notification center configuration.
 * @returns A fully initialised `NotificationCenterProvider` backed by the bonded DataStore.
 */
export function createProvider(
  config: DatabaseNotificationCenterConfig = {},
): NotificationCenterProvider {
  const { tableName = 'notifications', preferencesTableName = 'notification_preferences' } = config

  const provider: NotificationCenterProvider = {
    async send(userId: string, notification: CreateNotification): Promise<Notification> {
      const store = getStore()
      const id = randomUUID()
      const now = new Date().toISOString()

      const result = await store.create<Record<string, unknown>>(tableName, {
        id,
        user_id: userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        read: false,
        data: notification.data ? JSON.stringify(notification.data) : null,
        channels: notification.channels ? JSON.stringify(notification.channels) : null,
        created_at: now,
      })

      if (result.data) {
        return toNotification(result.data)
      }

      return {
        id,
        userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        read: false,
        data: notification.data,
        createdAt: new Date(now),
      }
    },

    async sendBulk(notifications: BulkNotification[]): Promise<Notification[]> {
      const results: Notification[] = []

      for (const entry of notifications) {
        const result = await provider.send(entry.userId, entry.notification)
        results.push(result)
      }

      return results
    },

    async getAll(
      userId: string,
      options?: NotificationQuery,
    ): Promise<PaginatedResult<Notification>> {
      const store = getStore()
      const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]

      if (options?.read !== undefined) {
        where.push({ field: 'read', operator: '=', value: options.read })
      }

      if (options?.type) {
        where.push({ field: 'type', operator: '=', value: options.type })
      }

      const limit = options?.limit ?? 50
      const offset = options?.offset ?? 0

      const findOptions: FindManyOptions = {
        where,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit,
        offset,
      }

      const [rows, total] = await Promise.all([
        store.findMany<Record<string, unknown>>(tableName, findOptions),
        store.count(tableName, where),
      ])

      return {
        items: rows.map(toNotification),
        total,
        offset,
        limit,
      }
    },

    async getUnreadCount(userId: string): Promise<number> {
      const store = getStore()
      return store.count(tableName, [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'read', operator: '=', value: false },
      ])
    },

    async markRead(userId: string, notificationId: string): Promise<boolean> {
      // Scope by user_id so a caller can only mark THEIR OWN notification read
      // (no cross-user IDOR / id-probing). Returns false when nothing matched.
      const store = getStore()
      const result = await store.updateMany(
        tableName,
        [
          { field: 'id', operator: '=', value: notificationId },
          { field: 'user_id', operator: '=', value: userId },
        ],
        { read: true },
      )
      return result.affected > 0
    },

    async markAllRead(userId: string): Promise<void> {
      const store = getStore()
      await store.updateMany(
        tableName,
        [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'read', operator: '=', value: false },
        ],
        { read: true },
      )
    },

    async delete(userId: string, notificationId: string): Promise<boolean> {
      // Owner-scoped delete: only the notification's owner may remove it.
      const store = getStore()
      const result = await store.deleteMany(tableName, [
        { field: 'id', operator: '=', value: notificationId },
        { field: 'user_id', operator: '=', value: userId },
      ])
      return result.affected > 0
    },

    async getPreferences(userId: string): Promise<NotificationPreferences> {
      const store = getStore()
      const row = await store.findOne<Record<string, unknown>>(preferencesTableName, [
        { field: 'user_id', operator: '=', value: userId },
      ])

      if (!row) {
        // Fresh `channels` object per call — `{ ...DEFAULT_PREFERENCES }` alone
        // copies the `channels` REFERENCE, so one caller mutating its result
        // (e.g. a prefs UI toggling a channel before saving) would silently
        // pollute the defaults handed to every other user.
        return { ...DEFAULT_PREFERENCES, channels: {} }
      }

      // Boolean()/parseJsonColumn: SQLite/MySQL hand back 0/1 and JSON strings.
      return {
        email: Boolean(row.email),
        push: Boolean(row.push),
        sms: Boolean(row.sms),
        channels: (parseJsonColumn(row.channels) as Record<string, boolean> | undefined) ?? {},
      }
    },

    async setPreferences(
      userId: string,
      preferences: Partial<NotificationPreferences>,
    ): Promise<void> {
      const store = getStore()
      const existing = await store.findOne<Record<string, unknown>>(preferencesTableName, [
        { field: 'user_id', operator: '=', value: userId },
      ])

      const data: Record<string, unknown> = {}
      if (preferences.email !== undefined) data.email = preferences.email
      if (preferences.push !== undefined) data.push = preferences.push
      if (preferences.sms !== undefined) data.sms = preferences.sms
      if (preferences.channels !== undefined) data.channels = JSON.stringify(preferences.channels)

      if (existing) {
        await store.updateById(preferencesTableName, existing.id as string, data)
      } else {
        await store.create(preferencesTableName, {
          id: randomUUID(),
          user_id: userId,
          email: preferences.email ?? DEFAULT_PREFERENCES.email,
          push: preferences.push ?? DEFAULT_PREFERENCES.push,
          sms: preferences.sms ?? DEFAULT_PREFERENCES.sms,
          channels: JSON.stringify(preferences.channels ?? DEFAULT_PREFERENCES.channels),
        })
      }
    },
  }

  return provider
}
