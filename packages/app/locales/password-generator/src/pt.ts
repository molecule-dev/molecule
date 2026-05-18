import type { PasswordGeneratorTranslations } from './types.js'

/** PasswordGenerator translations for pt. */
export const pt: Partial<PasswordGeneratorTranslations> = {
  'password-generator.readoutLabel': 'Senha gerada',
  'password-generator.copy': 'Copiar',
  'password-generator.copied': 'Copiado!',
  'password-generator.regenerate': 'Gerar novamente',
  'password-generator.length': 'Comprimento:<x> {{comprimento}}</x>',
  'password-generator.lengthLabel': 'Comprimento da senha',
  'password-generator.toggle.uppercase': 'Maiúsculas (AZ)',
  'password-generator.toggle.lowercase': 'Minúsculas (az)',
  'password-generator.toggle.digits': 'Dígitos (0-9)',
  'password-generator.toggle.symbols': 'Símbolos (!@#…)',
  'password-generator.toggle.noSimilar': 'Ignorar similares (0/O/1/l/I)',
  'password-generator.toggle.noAmbiguous': 'Ignorar ambiguidades (espaços, aspas)',
  'password-generator.pick': 'Use esta senha',
}
