import type { SecretsTranslations } from './types.js'

/** Secrets translations for English. */
export const en: SecretsTranslations = {
  'secrets.error.required':
    "Required secret '{{key}}' is not set. Check your environment configuration.",
  'secrets.error.patternMismatch': "Secret '{{key}}' does not match expected pattern",
}
