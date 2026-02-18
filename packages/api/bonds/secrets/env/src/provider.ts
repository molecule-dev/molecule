/**
 * Environment variables secrets provider.
 *
 * Reads secrets from .env files and process.env.
 *
 * @module
 */

import { access, readFile, writeFile } from 'node:fs/promises'

import type { SecretsProvider } from '@molecule/api-secrets'

/**
 * Parses a `.env` file string into key-value pairs. Handles comments, quoted values
 * (single and double), and escape sequences (`\n`, `\r`, `\t`, `\\`) in double-quoted values.
 * @param content - The raw `.env` file content.
 * @returns A record of environment variable key-value pairs.
 */
function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const line of content.split('\n')) {
    // Skip empty lines and comments
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    // Parse key=value (handle quotes)
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()

      // Remove surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      // Handle escape sequences in double-quoted values
      if (match[2].trim().startsWith('"')) {
        value = value
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\')
      }

      result[key] = value
    }
  }

  return result
}

/**
 * Serializes a record of key-value pairs into `.env` file format. Values containing
 * newlines, spaces, or quotes are automatically double-quoted with escape sequences.
 * @param values - The key-value pairs to serialize.
 * @returns A `.env`-formatted string with one `KEY=value` per line.
 */
function serializeEnvFile(values: Record<string, string>): string {
  const lines: string[] = []

  for (const [key, value] of Object.entries(values)) {
    // Quote values that contain special characters
    if (value.includes('\n') || value.includes(' ') || value.includes('"') || value.includes("'")) {
      const escaped = value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"')
      lines.push(`${key}="${escaped}"`)
    } else {
      lines.push(`${key}=${value}`)
    }
  }

  return lines.join('\n') + '\n'
}

/**
 * Options for env provider.
 */
export interface EnvProviderOptions {
  /**
   * Path to the .env file.
   * @default '.env'
   */
  path?: string

  /**
   * Whether to load the .env file on initialization.
   * @default true
   */
  autoLoad?: boolean

  /**
   * Whether to override existing environment variables.
   * @default false
   */
  override?: boolean
}

/**
 * Creates an environment variables secrets provider that reads from a `.env` file and `process.env`.
 * Supports get/set/delete with file persistence, and `syncToEnv` to copy `.env` values into `process.env`.
 * @param options - Path to `.env` file (default `'.env'`), auto-load flag, and override behavior.
 * @returns A `SecretsProvider` backed by `.env` files and `process.env`.
 */
export function createEnvProvider(options: EnvProviderOptions = {}): SecretsProvider {
  const envPath = options.path ?? '.env'
  const override = options.override ?? false

  let envFileCache: Record<string, string> | null = null
  let loaded = false

  /**
   * Loads and caches the `.env` file contents. Returns the cached result on subsequent calls.
   * @returns The parsed key-value pairs from the `.env` file, or an empty record if the file doesn't exist.
   */
  async function loadEnvFile(): Promise<Record<string, string>> {
    if (envFileCache !== null) return envFileCache

    try {
      const content = await readFile(envPath, 'utf-8')
      envFileCache = parseEnvFile(content)
    } catch {
      envFileCache = {}
    }

    return envFileCache
  }

  return {
    name: 'env',

    async get(key: string): Promise<string | undefined> {
      // Check process.env first (unless override is set)
      if (!override && process.env[key] !== undefined) {
        return process.env[key]
      }

      // Then check .env file
      const envFile = await loadEnvFile()
      if (envFile[key] !== undefined) {
        return envFile[key]
      }

      // Fall back to process.env
      return process.env[key]
    },

    async getMany(keys: string[]): Promise<Record<string, string | undefined>> {
      const envFile = await loadEnvFile()
      const result: Record<string, string | undefined> = {}

      for (const key of keys) {
        if (!override && process.env[key] !== undefined) {
          result[key] = process.env[key]
        } else if (envFile[key] !== undefined) {
          result[key] = envFile[key]
        } else {
          result[key] = process.env[key]
        }
      }

      return result
    },

    async set(key: string, value: string): Promise<void> {
      const envFile = await loadEnvFile()
      envFile[key] = value
      envFileCache = envFile

      // Write back to file
      await writeFile(envPath, serializeEnvFile(envFile))

      // Also set in process.env
      process.env[key] = value
    },

    async delete(key: string): Promise<void> {
      const envFile = await loadEnvFile()
      delete envFile[key]
      envFileCache = envFile

      await writeFile(envPath, serializeEnvFile(envFile))
      delete process.env[key]
    },

    async isAvailable(): Promise<boolean> {
      try {
        await access(envPath)
        return true
      } catch {
        // .env file doesn't exist, but we can still use process.env
        return true
      }
    },

    async syncToEnv(keys: string[]): Promise<void> {
      if (loaded && !override) return

      const envFile = await loadEnvFile()

      for (const key of keys) {
        const value = envFile[key]
        if (value !== undefined && (override || process.env[key] === undefined)) {
          process.env[key] = value
        }
      }

      loaded = true
    },
  }
}

/** Default env provider instance, reading from `.env` in the current working directory. */
export const provider: SecretsProvider = createEnvProvider()
