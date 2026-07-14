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
 * import {
 *   createFirmwareRouter,
 *   type DeviceTokenMiddleware,
 * } from '@molecule/api-resource-firmware'
 *
 * // Device-auth implementations vary per deployment (token, mTLS, JWT, …),
 * // so the status-report endpoint takes a caller-supplied authorizer. On
 * // success it MUST set `res.locals.deviceAuth = { deviceId, ownerId }`;
 * // on failure it responds 401.
 * const requireDeviceToken: DeviceTokenMiddleware = async (req, res, next) => {
 *   const device = await verifyDeviceToken(req.header('authorization'))
 *   if (!device) {
 *     res.sendStatus(401)
 *     return
 *   }
 *   res.locals.deviceAuth = { deviceId: device.id, ownerId: device.ownerId }
 *   next()
 * }
 *
 * const app = express()
 * app.use('/api/firmware', createFirmwareRouter({ requireDeviceToken }))
 * ```
 *
 * @remarks
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
