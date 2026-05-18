import type { PasswordGeneratorTranslations } from './types.js'

/** PasswordGenerator translations for nl. */
export const nl: Partial<PasswordGeneratorTranslations> = {
  'password-generator.readoutLabel': 'Gegenereerd wachtwoord',
  'password-generator.copy': 'Kopiëren',
  'password-generator.copied': 'Gekopieerd!',
  'password-generator.regenerate': 'Opnieuw genereren',
  'password-generator.length': 'Lengte:<x> {{lengte}}</x>',
  'password-generator.lengthLabel': 'Wachtwoordlengte',
  'password-generator.toggle.uppercase': 'Hoofdletters (AZ)',
  'password-generator.toggle.lowercase': 'Kleine letter (az)',
  'password-generator.toggle.digits': 'Cijfers (0-9)',
  'password-generator.toggle.symbols': 'Symbolen (!@#…)',
  'password-generator.toggle.noSimilar': 'Sla vergelijkbare waarden over (0/O/1/l/I)',
  'password-generator.toggle.noAmbiguous':
    'Sla dubbelzinnige tekens (spaties, aanhalingstekens) over.',
  'password-generator.pick': 'Gebruik dit wachtwoord',
}
