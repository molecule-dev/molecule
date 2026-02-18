/** Translation keys for the http locale package. */
export type HttpTranslationKey = 'http.error.requestFailed' | 'http.error.networkError'

/** Translation record mapping http keys to translated strings. */
export type HttpTranslations = Record<HttpTranslationKey, string>
