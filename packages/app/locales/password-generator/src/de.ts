import type { PasswordGeneratorTranslations } from './types.js'

/** PasswordGenerator translations for de. */
export const de: Partial<PasswordGeneratorTranslations> = {
  'password-generator.readoutLabel': 'Generiertes Passwort',
  'password-generator.copy': 'Kopieren',
  'password-generator.copied': 'Kopiert!',
  'password-generator.regenerate': 'Neu generieren',
  'password-generator.length': 'Länge:<x> {{Länge}}</x>',
  'password-generator.lengthLabel': 'Passwortlänge',
  'password-generator.toggle.uppercase': 'Großbuchstaben (AZ)',
  'password-generator.toggle.lowercase': 'Kleinbuchstabe (az)',
  'password-generator.toggle.digits': 'Ziffern (0-9)',
  'password-generator.toggle.symbols': 'Symbole (!@#…)',
  'password-generator.toggle.noSimilar': 'Ähnliche überspringen (0/O/1/l/I)',
  'password-generator.toggle.noAmbiguous':
    'Mehrdeutige Zeichen (Leerzeichen, Anführungszeichen) überspringen',
  'password-generator.pick': 'Verwenden Sie dieses Passwort',
}
