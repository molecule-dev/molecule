/**
 * Default English translations for IAP error utilities.
 *
 * Used as inline fallbacks when no i18n provider is available.
 *
 * @module
 */

/**
 * The default translations.
 */
export const defaultTranslations = {
  en: {
    'iap.error.E_UNKNOWN': 'An unknown error occurred.',
    'iap.error.E_NOT_AVAILABLE': 'In-app purchases are not available.',
    'iap.error.E_USER_CANCELLED': 'Purchase was cancelled.',
    'iap.error.E_ITEM_UNAVAILABLE': 'This item is not available for purchase.',
    'iap.error.E_NETWORK': 'A network error occurred. Please try again.',
    'iap.error.E_SERVICE_ERROR': 'The store service encountered an error.',
    'iap.error.E_ALREADY_OWNED': 'You already own this item.',
    'iap.error.E_NOT_OWNED': 'You do not own this item.',
    'iap.error.E_VERIFICATION_FAILED': 'Purchase verification failed.',
    'iap.error.E_DEFERRED': 'Purchase is pending approval.',
  },
} as const
