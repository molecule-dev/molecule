/**
 * Test fixtures for molecule.dev resources.
 *
 * @module
 */

import type {
  DeviceFixture,
  DeviceFixtureOverrides,
  SessionFixture,
  SessionFixtureOverrides,
  UserFixture,
  UserFixtureOverrides,
} from './types.js'

/**
 * Creates a user fixture with random defaults, optionally overridden.
 * @param overrides - Partial overrides for user properties (id, username, email, name, timestamps).
 * @returns A complete UserFixture object.
 */
export const createUserFixture = (overrides?: Partial<UserFixtureOverrides>): UserFixture => {
  const now = new Date().toISOString()
  return {
    id: overrides?.id ?? crypto.randomUUID(),
    username: overrides?.username ?? `user_${Math.random().toString(36).slice(2, 10)}`,
    email: overrides?.email ?? `${Math.random().toString(36).slice(2, 10)}@test.molecule.dev`,
    name: overrides?.name ?? null,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
  }
}

/**
 * Creates a device fixture with random defaults, optionally overridden.
 * @param overrides - Partial overrides for device properties (id, userId, platform, timestamps).
 * @returns A complete DeviceFixture object.
 */
export const createDeviceFixture = (overrides?: Partial<DeviceFixtureOverrides>): DeviceFixture => {
  const now = new Date().toISOString()
  return {
    id: overrides?.id ?? crypto.randomUUID(),
    userId: overrides?.userId ?? crypto.randomUUID(),
    platform: overrides?.platform ?? 'web',
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
  }
}

/**
 * Creates a session fixture with random defaults and a 7-day expiry, optionally overridden.
 * @param overrides - Partial overrides for session properties (userId, deviceId, token, expiresAt).
 * @returns A complete SessionFixture object.
 */
export const createSessionFixture = (
  overrides?: Partial<SessionFixtureOverrides>,
): SessionFixture => {
  const expires = new Date()
  expires.setDate(expires.getDate() + 7)
  return {
    userId: overrides?.userId ?? crypto.randomUUID(),
    deviceId: overrides?.deviceId ?? crypto.randomUUID(),
    token: overrides?.token ?? `test_token_${Math.random().toString(36).slice(2)}`,
    expiresAt: overrides?.expiresAt ?? expires.toISOString(),
  }
}

/**
 * Creates an array of fixtures by calling a factory function `count` times.
 * @param factory - A function that receives the index and returns a fixture.
 * @param count - Number of fixtures to create.
 * @returns An array of `count` fixture objects.
 */
export const createMany = <T>(factory: (index: number) => T, count: number): T[] => {
  return Array.from({ length: count }, (_, i) => factory(i))
}
