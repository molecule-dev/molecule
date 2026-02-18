import { v4 as uuid } from 'uuid'

import { getLogger } from '@molecule/api-bond'
import { create, deleteMany, findMany, findOne, updateById } from '@molecule/api-database'
const logger = getLogger()
import { resource } from './resource.js'
import type { DeviceService } from './types.js'

const { tableName } = resource

/**
 * DeviceService implementation for the bond system.
 *
 * Provides device CRUD operations that other resources
 * can use through `get('device')` / `require('device')`.
 */
export const deviceService: DeviceService = {
  async createOrUpdate(userId: string, deviceName: string): Promise<string | null> {
    try {
      const existingDevice = await findOne<{ id: string }>(tableName, [
        { field: 'userId', operator: '=', value: userId },
        { field: 'name', operator: '=', value: deviceName },
      ])

      if (existingDevice) {
        await updateById(tableName, existingDevice.id, { updatedAt: new Date().toISOString() })

        return existingDevice.id
      }

      const deviceId = uuid()
      const now = new Date().toISOString()

      await create(tableName, {
        id: deviceId,
        createdAt: now,
        updatedAt: now,
        userId,
        name: deviceName,
      })

      return deviceId
    } catch (error) {
      logger.error(error)
      return null
    }
  },

  async updateLastSeen(deviceId: string): Promise<void> {
    try {
      await updateById(tableName, deviceId, { updatedAt: new Date().toISOString() })
    } catch (error) {
      logger.error(error)
    }
  },

  async deleteByUserId(userId: string): Promise<void> {
    try {
      await deleteMany(tableName, [{ field: 'userId', operator: '=', value: userId }])
    } catch (error) {
      logger.error(error)
    }
  },

  async getWithPushSubscription(
    userId: string,
  ): Promise<Array<{ id: string; pushPlatform: string; pushSubscription: unknown }>> {
    try {
      return await findMany<{ id: string; pushPlatform: string; pushSubscription: unknown }>(
        tableName,
        {
          where: [
            { field: 'userId', operator: '=', value: userId },
            { field: 'hasPushSubscription', operator: '=', value: true },
          ],
        },
      )
    } catch (error) {
      logger.error(error)
      return []
    }
  },
}
