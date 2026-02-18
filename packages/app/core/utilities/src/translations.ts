/**
 * Default English translations for error utilities.
 *
 * Used as inline fallbacks when no i18n provider is available.
 * Full translations are provided by `@molecule/app-locales-utilities`.
 *
 * @module
 */

/**
 * The default translations.
 */
export const defaultTranslations = {
  en: {
    'error.networkError': 'Network error. Please check your connection.',
    'error.timeout': 'Request timed out. Please try again.',
    'error.unauthorized': 'You are not authorized to perform this action.',
    'error.forbidden': 'Access denied.',
    'error.notFound': 'Resource not found.',
    'error.validationError': 'Please check your input and try again.',
    'error.serverError': 'Server error. Please try again later.',
    'error.unknown': 'An unexpected error occurred.',
  },
} as const
