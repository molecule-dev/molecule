import type { ConfigTranslations } from './types.js'

/** Config translations for Polish. */
export const pl: ConfigTranslations = {
  'config.error.required': "Wymagana konfiguracja '{{key}}' nie jest ustawiona.",
  'config.error.mustBeNumber': "Konfiguracja '{{key}}' musi być liczbą.",
  'config.error.minValue': "Konfiguracja '{{key}}' musi wynosić co najmniej {{min}}.",
  'config.error.maxValue': "Konfiguracja '{{key}}' może wynosić maksymalnie {{max}}.",
  'config.error.mustBeBoolean':
    "Konfiguracja '{{key}}' musi być wartością logiczną (true/false/1/0).",
  'config.error.mustBeJson': "Konfiguracja '{{key}}' musi być prawidłowym JSON.",
  'config.error.patternMismatch': "Konfiguracja '{{key}}' nie pasuje do wzorca '{{pattern}}'.",
  'config.error.invalidEnum': "Konfiguracja '{{key}}' musi być jedną z: {{values}}.",
  'config.error.validationNotSupported': 'Obecny dostawca konfiguracji nie obsługuje walidacji.',
}
