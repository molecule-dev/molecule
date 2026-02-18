/**
 * Form validation logic for molecule.dev.
 *
 * @module
 */

import type { ValidationSchema } from './types.js'

/**
 * Translation function signature compatible with `@molecule/app-i18n`.
 */
type TranslateFn = (
  key: string,
  values?: Record<string, unknown>,
  options?: { defaultValue?: string },
) => string

/**
 * Validates a value against a validation schema.
 *
 * When a translation function `t` is provided, default validation messages
 * will be passed through it for i18n support.
 * @param value - The value to validate (string, number, array, or any type accepted by custom validators).
 * @param schema - The validation rules to check against (required, min/max, pattern, email, etc.).
 * @param t - Optional i18n translation function for localizing error messages.
 * @returns The first validation error message, or `undefined` if the value passes all checks.
 */
export const validateValue = async (
  value: unknown,
  schema: ValidationSchema,
  t?: TranslateFn,
): Promise<string | undefined> => {
  const msg = (key: string, defaultValue: string, values?: Record<string, unknown>): string =>
    t ? t(key, values, { defaultValue }) : defaultValue

  // Required check
  if (schema.required) {
    const isEmpty =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    if (isEmpty) {
      return typeof schema.required === 'string'
        ? schema.required
        : msg('forms.required', 'This field is required')
    }
  }

  // Skip other validations if value is empty and not required
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  // Min check (numbers)
  if (schema.min !== undefined) {
    const minValue = typeof schema.min === 'object' ? schema.min.value : schema.min
    const message =
      typeof schema.min === 'object'
        ? schema.min.message
        : msg('forms.min', `Value must be at least ${minValue}`, { min: minValue })
    if (typeof value === 'number' && value < minValue) {
      return message
    }
  }

  // Max check (numbers)
  if (schema.max !== undefined) {
    const maxValue = typeof schema.max === 'object' ? schema.max.value : schema.max
    const message =
      typeof schema.max === 'object'
        ? schema.max.message
        : msg('forms.max', `Value must be at most ${maxValue}`, { max: maxValue })
    if (typeof value === 'number' && value > maxValue) {
      return message
    }
  }

  // MinLength check (strings/arrays)
  if (schema.minLength !== undefined) {
    const minLength =
      typeof schema.minLength === 'object' ? schema.minLength.value : schema.minLength
    const message =
      typeof schema.minLength === 'object'
        ? schema.minLength.message
        : msg('forms.minLength', `Must be at least ${minLength} characters`, { minLength })
    const length =
      typeof value === 'string' ? value.length : Array.isArray(value) ? value.length : 0
    if (length < minLength) {
      return message
    }
  }

  // MaxLength check (strings/arrays)
  if (schema.maxLength !== undefined) {
    const maxLength =
      typeof schema.maxLength === 'object' ? schema.maxLength.value : schema.maxLength
    const message =
      typeof schema.maxLength === 'object'
        ? schema.maxLength.message
        : msg('forms.maxLength', `Must be at most ${maxLength} characters`, { maxLength })
    const length =
      typeof value === 'string' ? value.length : Array.isArray(value) ? value.length : 0
    if (length > maxLength) {
      return message
    }
  }

  // Pattern check
  if (schema.pattern !== undefined) {
    const pattern = schema.pattern instanceof RegExp ? schema.pattern : schema.pattern.value
    const message =
      schema.pattern instanceof RegExp
        ? msg('forms.invalidFormat', 'Invalid format')
        : schema.pattern.message
    if (typeof value === 'string' && !pattern.test(value)) {
      return message
    }
  }

  // Email check
  if (schema.email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const message =
      typeof schema.email === 'string'
        ? schema.email
        : msg('forms.invalidEmail', 'Invalid email address')
    if (typeof value === 'string' && !emailPattern.test(value)) {
      return message
    }
  }

  // URL check
  if (schema.url) {
    const message =
      typeof schema.url === 'string' ? schema.url : msg('forms.invalidUrl', 'Invalid URL')
    try {
      new URL(value as string)
    } catch {
      return message
    }
  }

  // Custom validation
  if (schema.validate) {
    const result = await schema.validate(value)
    if (typeof result === 'string') {
      return result
    }
    if (result === false) {
      return msg('forms.invalidValue', 'Invalid value')
    }
  }

  return undefined
}
