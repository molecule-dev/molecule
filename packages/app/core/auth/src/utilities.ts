/**
 * Convenience wrappers around the auth client methods.
 *
 * These delegate to the bonded auth client retrieved via `getClient()`.
 *
 * Every wrapper that hands back a profile takes the profile type as a type
 * argument — `login<SessionUser>(…)`, `register<TExtra, SessionUser>(…)` — so an
 * app that bonded a client with its own profile reads that profile from the
 * result. Without it the default, `UserProfile`, applies: its `id: string` is
 * the contract of the default configuration, not a value the client invents for
 * a custom one.
 *
 * @module
 */

import { getClient } from './provider.js'
import type {
  AuthProfileConstraint,
  AuthResult,
  LoginCredentials,
  RegisterData,
  RegisterExtraShape,
  UserProfile,
} from './types.js'

/**
 * Checks if the current user is authenticated.
 *
 * @returns `true` if the user has an active session.
 */
export const isAuthenticated = (): boolean => getClient().isAuthenticated()

/**
 * Returns the current user profile, or `null` if not authenticated.
 *
 * @template T - The user profile the bonded client returns: a JSON object type
 *   of named fields (see {@link AuthProfileConstraint}), including an app
 *   profile with no `id`. Defaults to {@link UserProfile}; name it at the call.
 * @returns The user profile, or `null` if not authenticated.
 */
export const getUser = <T extends AuthProfileConstraint<T> = UserProfile>(): T | null =>
  getClient<T>().getUser()

/**
 * Logs in with the given credentials (email/username + password).
 *
 * @template T - The user profile the bonded client returns. Pass the app's own
 *   profile when the client was created with one
 *   (`createJWTAuthClient<SessionUser>`), so `result.user` is typed for the
 *   pages; defaults to {@link UserProfile}.
 * @param credentials - Email/username and password.
 * @returns The auth result containing tokens and user profile.
 */
export const login = async <T extends AuthProfileConstraint<T> = UserProfile>(
  credentials: LoginCredentials,
): Promise<AuthResult<T>> => getClient<T>().login(credentials)

/**
 * Logs out the current user, clearing tokens and session state.
 * @returns A promise that resolves when logout completes.
 */
export const logout = (): Promise<void> => getClient().logout()

/**
 * Registers a new user account.
 *
 * The registration extra fields stay the FIRST type argument, exactly as before
 * (`register<{ username: string }>(data)` keeps compiling); the profile is the
 * second one (`register<{ username: string }, SessionUser>(data)`).
 *
 * @template TExtra - The app's own registration fields, at the top level
 *   (`{ username: string }` for a RealWorld-shaped API); defaults to none.
 * @template T - The user profile the bonded client returns. Pass the app's own
 *   profile when the client was created with one; defaults to
 *   {@link UserProfile}.
 * @param data - Registration data (email, password, and any `TExtra` fields).
 * @returns The auth result containing tokens and user profile.
 */
export const register = async <
  TExtra extends RegisterExtraShape<TExtra> = Record<never, never>,
  T extends AuthProfileConstraint<T> = UserProfile,
>(
  data: RegisterData<TExtra>,
): Promise<AuthResult<T>> => getClient<T, TExtra>().register(data)
