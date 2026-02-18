/**
 * Convenience wrappers around the auth client methods.
 *
 * These delegate to the bonded auth client retrieved via `getClient()`.
 *
 * @module
 */

import { getClient } from './provider.js'
import type { AuthResult, LoginCredentials, RegisterData, UserProfile } from './types.js'

/**
 * Checks if the current user is authenticated.
 *
 * @returns `true` if the user has an active session.
 */
export const isAuthenticated = (): boolean => getClient().isAuthenticated()

/**
 * Returns the current user profile, or `null` if not authenticated.
 * @returns The user profile, or `null` if not authenticated.
 */
export const getUser = <T extends UserProfile = UserProfile>(): T | null => getClient<T>().getUser()

/**
 * Logs in with the given credentials (email/username + password).
 *
 * @param credentials - Email/username and password.
 * @returns The auth result containing tokens and user profile.
 */
export const login = (credentials: LoginCredentials): Promise<AuthResult> =>
  getClient().login(credentials)

/**
 * Logs out the current user, clearing tokens and session state.
 * @returns A promise that resolves when logout completes.
 */
export const logout = (): Promise<void> => getClient().logout()

/**
 * Registers a new user account.
 *
 * @param data - Registration data (email, password, name, etc.).
 * @returns The auth result containing tokens and user profile.
 */
export const register = (data: RegisterData): Promise<AuthResult> => getClient().register(data)
