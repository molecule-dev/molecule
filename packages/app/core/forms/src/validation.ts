/**
 * Form validation logic for molecule.dev.
 *
 * @module
 */

import type { InterpolationValues } from '@molecule/app-i18n'

import type { ValidationSchema } from './types.js'

/**
 * Translation function signature compatible with `@molecule/app-i18n`.
 */
type TranslateFn = (
  key: string,
  values?: InterpolationValues,
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
  // A failure must always carry visible text: an empty, blank or non-string translation
  // (i18next's returnDetails gives an object) falls back to the built-in English message.
  const visible = (message: unknown): message is string =>
    typeof message === 'string' && message.trim().length > 0
  const msg = (key: string, defaultValue: string, values?: InterpolationValues): string => {
    const translated: unknown = t?.(key, values, { defaultValue })
    return visible(translated) ? translated : defaultValue
  }
  // A rule's own message, or the built-in one when it is not usable text.
  const text = (
    message: unknown,
    key: string,
    defaultValue: string,
    values?: InterpolationValues,
  ): string => (visible(message) ? message : msg(key, defaultValue, values))
  // A rule is on whenever it is set, whatever its message: `required: t(...)` that translates to
  // '' must still require the value.
  const on = (rule: unknown): boolean => rule !== undefined && rule !== null && rule !== false

  // Required check
  if (on(schema.required)) {
    const isEmpty =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    if (isEmpty) {
      return text(schema.required, 'forms.required', 'This field is required')
    }
  }

  // Skip other validations if value is empty and not required
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  // Min check (numbers)
  if (schema.min !== undefined) {
    const minValue = typeof schema.min === 'object' ? schema.min.value : schema.min
    const message = text(
      typeof schema.min === 'object' ? schema.min.message : undefined,
      'forms.min',
      `Value must be at least ${minValue}`,
      { min: minValue },
    )
    if (typeof value === 'number' && value < minValue) {
      return message
    }
  }

  // Max check (numbers)
  if (schema.max !== undefined) {
    const maxValue = typeof schema.max === 'object' ? schema.max.value : schema.max
    const message = text(
      typeof schema.max === 'object' ? schema.max.message : undefined,
      'forms.max',
      `Value must be at most ${maxValue}`,
      { max: maxValue },
    )
    if (typeof value === 'number' && value > maxValue) {
      return message
    }
  }

  // MinLength check (strings/arrays)
  if (schema.minLength !== undefined) {
    const minLength =
      typeof schema.minLength === 'object' ? schema.minLength.value : schema.minLength
    const message = text(
      typeof schema.minLength === 'object' ? schema.minLength.message : undefined,
      'forms.minLength',
      `Must be at least ${minLength} characters`,
      { minLength },
    )
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
    const message = text(
      typeof schema.maxLength === 'object' ? schema.maxLength.message : undefined,
      'forms.maxLength',
      `Must be at most ${maxLength} characters`,
      { maxLength },
    )
    const length =
      typeof value === 'string' ? value.length : Array.isArray(value) ? value.length : 0
    if (length > maxLength) {
      return message
    }
  }

  // Pattern check
  if (schema.pattern !== undefined) {
    const pattern = schema.pattern instanceof RegExp ? schema.pattern : schema.pattern.value
    const message = text(
      schema.pattern instanceof RegExp ? undefined : schema.pattern.message,
      'forms.invalidFormat',
      'Invalid format',
    )
    if (typeof value === 'string' && !pattern.test(value)) {
      return message
    }
  }

  // Email check
  if (on(schema.email)) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const message = text(schema.email, 'forms.invalidEmail', 'Invalid email address')
    if (typeof value === 'string' && !emailPattern.test(value)) {
      return message
    }
  }

  // URL check
  if (on(schema.url)) {
    const message = text(schema.url, 'forms.invalidUrl', 'Invalid URL')
    try {
      new URL(value as string)
    } catch (_error) {
      // URL constructor throws a TypeError for invalid URLs; the error carries no
      // actionable detail beyond the fact that parsing failed, which is expressed
      // by returning the validation message to the caller.
      return message
    }
  }

  // Custom validation
  if (schema.validate) {
    // Only `true` (or no answer) passes. Any string is a failure, as in react-hook-form, and an
    // empty or non-string one (a translation object) shows the built-in message.
    const result: unknown = await schema.validate(value)
    if (result !== true && result !== undefined && result !== null) {
      return text(result, 'forms.invalidValue', 'Invalid value')
    }
  }

  return undefined
}
