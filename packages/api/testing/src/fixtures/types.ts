/**
 * Test fixture type definitions.
 *
 * @module
 */

/**
 * User fixture properties.
 */
export interface UserFixture {
  id: string
  username: string
  email: string | null
  name: string | null
  createdAt: string
  updatedAt: string
}

/**
 * User fixture override options.
 */
export interface UserFixtureOverrides {
  id?: string
  username?: string
  email?: string
  name?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * Device fixture properties.
 */
export interface DeviceFixture {
  id: string
  userId: string
  platform: string
  createdAt: string
  updatedAt: string
}

/**
 * Device fixture override options.
 */
export interface DeviceFixtureOverrides {
  id?: string
  userId?: string
  platform?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * Session fixture properties.
 */
export interface SessionFixture {
  userId: string
  deviceId: string
  token: string
  expiresAt: string
}

/**
 * Session fixture override options.
 */
export interface SessionFixtureOverrides {
  userId?: string
  deviceId?: string
  token?: string
  expiresAt?: string
}
