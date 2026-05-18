import type { PasswordGeneratorTranslations } from './types.js'

/** PasswordGenerator translations for fr. */
export const fr: Partial<PasswordGeneratorTranslations> = {
  'password-generator.readoutLabel': 'Mot de passe généré',
  'password-generator.copy': 'Copier',
  'password-generator.copied': 'Copié !',
  'password-generator.regenerate': 'Régénérer',
  'password-generator.length': 'Longueur:<x> {{longueur}}</x>',
  'password-generator.lengthLabel': 'Longueur du mot de passe',
  'password-generator.toggle.uppercase': 'Majuscules (AZ)',
  'password-generator.toggle.lowercase': 'Minuscules (az)',
  'password-generator.toggle.digits': 'Chiffres (0-9)',
  'password-generator.toggle.symbols': 'Symboles (!@#…)',
  'password-generator.toggle.noSimilar': 'Ignorer les éléments similaires (0/O/1/l/I)',
  'password-generator.toggle.noAmbiguous': 'Évitez les ambiguïtés (espaces, guillemets)',
  'password-generator.pick': 'Utilisez ce mot de passe',
}
