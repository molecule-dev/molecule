/**
 * `@molecule/api-resource-firmware` — owner-scoped firmware versions
 * and OTA rollouts.
 *
 * - Versions follow a draft → published → deprecated lifecycle.
 * - Rollouts target an explicit `device_ids[]` list, a `fleet_id`, or
 *   both. The intersection with owner-scoped devices is what actually
 *   gets enrolled.
 * - Per-device `firmware_update_tasks` rows are materialized and a
 *   matching `device_commands` row with `firmware_update` payload is
 *   created. Best-effort realtime broadcasts go out on
 *   `firmware:{deviceId}` and `commands:{deviceId}`.
 * - The device reports back via a token-authenticated status endpoint;
 *   the resource updates the rollout's completed/failed counters and
 *   bumps the device's `firmware_version` on success.
 *
 * Extracted from the iot-device-manager flagship.
 *
 * @example
 * ```ts
 * import express from 'express'
 *
 * import { findById, setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import { verifyToken } from '@molecule/api-resource-device-auth-token'
 * import {
 *   createFirmwareForOwner,
 *   createFirmwareRouter,
 *   type DeviceTokenMiddleware,
 *   publishFirmwareForOwner,
 * } from '@molecule/api-resource-firmware'
 *
 * // Startup: bond the DataStore once (the postgresql bond reads DATABASE_URL).
 * setStore(store)
 *
 * // Devices report rollout status with their own token. On success the authorizer MUST set
 * // res.locals.deviceAuth = { deviceId, ownerId }; otherwise respond 401.
 * const requireDeviceToken: DeviceTokenMiddleware = async (req, res, next) => {
 *   const token = await verifyToken((req.header('authorization') ?? '').replace(/^Bearer /, ''))
 *   const device = token ? await findById<{ owner_id: string }>('iot_devices', token.device_id) : null
 *   if (!token || !device) {
 *     res.sendStatus(401)
 *     return
 *   }
 *   res.locals.deviceAuth = { deviceId: token.device_id, ownerId: device.owner_id }
 *   next()
 * }
 *
 * // Mount AFTER the global auth middleware that sets res.locals.session (owner routes).
 * const app = express()
 * app.use(express.json())
 * app.use('/api/firmware', createFirmwareRouter({ requireDeviceToken }))
 *
 * // Server-side equivalent of POST /api/firmware then POST /api/firmware/:id/publish:
 * const ownerId = 'user-123'
 * const draft = await createFirmwareForOwner(ownerId, { version: '2.4.0', device_type: 'thermostat' })
 * const released = draft ? await publishFirmwareForOwner(ownerId, draft.id) : null
 * console.log(released?.status) // 'published' — only published firmware can be rolled out
 * ```
 *
 * @remarks
 * **Bond the DataStore first** (`setStore(...)` from `@molecule/api-database`).
 * `createFirmwareRouter()` REQUIRES a `requireDeviceToken` middleware — there is
 * no default device auth; `@molecule/api-resource-device-auth-token`'s
 * `verifyToken()` is the ready-made building block. Firmware is created as
 * `'draft'`; `POST /rollouts` answers 400 until it is published
 * (`POST /:id/publish`). Realtime pushes to devices are best-effort: with no
 * `@molecule/api-realtime` bond they are silently skipped, and devices must poll
 * their `device_commands`.
 *
 * The schema in `__setup__/firmware.sql` creates `firmware_versions`,
 * `firmware_rollouts`, and `firmware_update_tasks`. The resource also
 * reads/writes `iot_devices`, `fleets`, `fleet_memberships`,
 * `device_commands`, and `device_alerts` — those tables are owned by
 * the iot-device-manager template.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
