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
 * Maps a database row to a `Notification` object.
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
    read: row.read as boolean,
    data: row.data as Record<string, unknown> | undefined,
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

    async markRead(notificationId: string): Promise<void> {
      const store = getStore()
      await store.updateById(tableName, notificationId, { read: true })
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

    async delete(notificationId: string): Promise<void> {
      const store = getStore()
      await store.deleteById(tableName, notificationId)
    },

    async getPreferences(userId: string): Promise<NotificationPreferences> {
      const store = getStore()
      const row = await store.findOne<Record<string, unknown>>(preferencesTableName, [
        { field: 'user_id', operator: '=', value: userId },
      ])

      if (!row) {
        return { ...DEFAULT_PREFERENCES }
      }

      return {
        email: row.email as boolean,
        push: row.push as boolean,
        sms: row.sms as boolean,
        channels: (row.channels as Record<string, boolean>) ?? {},
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
