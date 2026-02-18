/**
 * Environment-based configuration provider.
 *
 * @module
 */

import type { ConfigProvider, ConfigSchema, ConfigValidationResult } from '@molecule/api-config'
import { t } from '@molecule/api-i18n'

/**
 * Environment-based configuration provider.
 */
export const envProvider: ConfigProvider = {
  get<T = string>(key: string, defaultValue?: T): T | undefined {
    const value = process.env[key]
    if (value === undefined) {
      return defaultValue
    }
    return value as T
  },

  getRequired<T = string>(key: string): T {
    const value = process.env[key]
    if (value === undefined) {
      throw new Error(
        t(
          'config.error.required',
          { key },
          { defaultValue: `Required configuration '${key}' is not set.` },
        ),
      )
    }
    return value as T
  },

  getAll(): Record<string, unknown> {
    return { ...process.env }
  },

  has(key: string): boolean {
    return process.env[key] !== undefined
  },

  set(key: string, value: unknown): void {
    process.env[key] = String(value)
  },

  validate(schema: ConfigSchema[]): ConfigValidationResult {
    const errors: ConfigValidationResult['errors'] = []
    const warnings: ConfigValidationResult['warnings'] = []

    for (const config of schema) {
      const value = process.env[config.key]

      if (config.required && value === undefined) {
        errors.push({
          key: config.key,
          message: t(
            'config.error.required',
            { key: config.key },
            { defaultValue: `Required configuration '${config.key}' is not set.` },
          ),
        })
        continue
      }

      if (value === undefined) {
        continue
      }

      if (config.type === 'number') {
        const num = Number(value)
        if (isNaN(num)) {
          errors.push({
            key: config.key,
            message: t(
              'config.error.mustBeNumber',
              { key: config.key },
              { defaultValue: `Configuration '${config.key}' must be a number.` },
            ),
          })
        } else {
          if (config.min !== undefined && num < config.min) {
            errors.push({
              key: config.key,
              message: t(
                'config.error.minValue',
                { key: config.key, min: String(config.min) },
                { defaultValue: `Configuration '${config.key}' must be at least ${config.min}.` },
              ),
            })
          }
          if (config.max !== undefined && num > config.max) {
            errors.push({
              key: config.key,
              message: t(
                'config.error.maxValue',
                { key: config.key, max: String(config.max) },
                { defaultValue: `Configuration '${config.key}' must be at most ${config.max}.` },
              ),
            })
          }
        }
      }

      if (config.type === 'boolean') {
        if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
          errors.push({
            key: config.key,
            message: t(
              'config.error.mustBeBoolean',
              { key: config.key },
              { defaultValue: `Configuration '${config.key}' must be a boolean (true/false/1/0).` },
            ),
          })
        }
      }

      if (config.type === 'json') {
        try {
          JSON.parse(value)
        } catch {
          errors.push({
            key: config.key,
            message: t(
              'config.error.mustBeJson',
              { key: config.key },
              { defaultValue: `Configuration '${config.key}' must be valid JSON.` },
            ),
          })
        }
      }

      if (config.pattern) {
        const regex = new RegExp(config.pattern)
        if (!regex.test(value)) {
          errors.push({
            key: config.key,
            message: t(
              'config.error.patternMismatch',
              { key: config.key, pattern: config.pattern },
              {
                defaultValue: `Configuration '${config.key}' does not match pattern '${config.pattern}'.`,
              },
            ),
          })
        }
      }

      if (config.enum && !config.enum.includes(value)) {
        errors.push({
          key: config.key,
          message: t(
            'config.error.invalidEnum',
            { key: config.key, values: config.enum.join(', ') },
            {
              defaultValue: `Configuration '${config.key}' must be one of: ${config.enum.join(', ')}.`,
            },
          ),
        })
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  },
}

/**
 * Default environment configuration provider.
 */
export const provider: ConfigProvider = envProvider
