/**
 * Configuration provider bond accessor and typed convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-config-env`) call `setProvider()` during setup.
 * Application code uses the typed getters (`get`, `getString`, `getNumber`,
 * `getBoolean`, `getJson`) which delegate to the bonded provider.
 *
 * @module
 */

import { bond, isBonded, require as bondRequire } from '@molecule/api-bond'

import type { ConfigProvider, ConfigSchema, ConfigValidationResult } from './types.js'

const BOND_TYPE = 'config'

/**
 * Registers a configuration provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The configuration provider implementation to bond.
 */
export const setProvider = (provider: ConfigProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded configuration provider, throwing if none is configured.
 *
 * @returns The bonded configuration provider.
 * @throws {Error} If no configuration provider has been bonded.
 */
export const getProvider = (): ConfigProvider => {
  try {
    return bondRequire<ConfigProvider>(BOND_TYPE)
  } catch {
    throw new Error('No configuration provider set. Call setProvider() first.')
  }
}

/**
 * Checks whether a configuration provider is currently bonded.
 *
 * @returns `true` if a configuration provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves a configuration value by key, with an optional default.
 *
 * @param key - The configuration key (e.g. `'DATABASE_URL'`, `'API_KEY'`).
 * @param defaultValue - Value to return if the key is not found.
 * @returns The configuration value cast to `T`, or `undefined` / `defaultValue` if not found.
 */
export const get = <T = string>(key: string, defaultValue?: T): T | undefined => {
  return getProvider().get<T>(key, defaultValue)
}

/**
 * Retrieves a configuration value by key, throwing if not found. Use this for
 * values that must be present for the application to function.
 *
 * @param key - The configuration key.
 * @returns The configuration value cast to `T`.
 * @throws {Error} If the key is not found in the configuration.
 */
export const getRequired = <T = string>(key: string): T => {
  return getProvider().getRequired<T>(key)
}

/**
 * Retrieves a configuration value as a string.
 *
 * @param key - The configuration key.
 * @param defaultValue - Value to return if the key is not found.
 * @returns The string value, or `undefined` / `defaultValue` if not found.
 */
export const getString = (key: string, defaultValue?: string): string | undefined => {
  return getProvider().get<string>(key, defaultValue)
}

/**
 * Retrieves a configuration value parsed as a number. Returns the default
 * value if the key is missing or the value is not a valid number.
 *
 * @param key - The configuration key.
 * @param defaultValue - Value to return if the key is missing or not a number.
 * @returns The parsed number, or `undefined` / `defaultValue`.
 */
export const getNumber = (key: string, defaultValue?: number): number | undefined => {
  const value = getProvider().get<string>(key)
  if (value === undefined) {
    return defaultValue
  }
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

/**
 * Retrieves a configuration value parsed as a boolean. Recognizes `'true'`, `'1'`,
 * and `'yes'` (case-insensitive) as `true`; everything else is `false`.
 *
 * @param key - The configuration key.
 * @param defaultValue - Value to return if the key is not found.
 * @returns The boolean value, or `undefined` / `defaultValue`.
 */
export const getBoolean = (key: string, defaultValue?: boolean): boolean | undefined => {
  const value = getProvider().get<string>(key)
  if (value === undefined) {
    return defaultValue
  }
  return ['true', '1', 'yes'].includes(value.toLowerCase())
}

/**
 * Retrieves a configuration value parsed as JSON. Returns the default value
 * if the key is missing or the value is not valid JSON.
 *
 * @param key - The configuration key.
 * @param defaultValue - Value to return if the key is missing or JSON parsing fails.
 * @returns The parsed JSON value cast to `T`, or `undefined` / `defaultValue`.
 */
export const getJson = <T = unknown>(key: string, defaultValue?: T): T | undefined => {
  const value = getProvider().get<string>(key)
  if (value === undefined) {
    return defaultValue
  }
  try {
    return JSON.parse(value) as T
  } catch {
    return defaultValue
  }
}

/**
 * Checks whether a configuration key exists (has a defined value).
 *
 * @param key - The configuration key to check.
 * @returns `true` if the key exists in the configuration.
 */
export const has = (key: string): boolean => {
  return getProvider().has(key)
}

/**
 * Validates the current configuration against an array of schema rules.
 * Returns validation errors and warnings. Throws if the provider doesn't
 * support validation.
 *
 * @param schema - Array of configuration schema rules to validate against.
 * @returns The validation result containing `valid`, `errors`, and `warnings`.
 * @throws {Error} If the provider doesn't support the `validate()` method.
 */
export const validate = (schema: ConfigSchema[]): ConfigValidationResult => {
  if (!getProvider().validate) {
    throw new Error('Current configuration provider does not support validation.')
  }
  return getProvider().validate!(schema)
}
