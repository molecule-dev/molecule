import type { PasswordGeneratorTranslations } from './types.js'

/** PasswordGenerator translations for ar. */
export const ar: Partial<PasswordGeneratorTranslations> = {
  'password-generator.readoutLabel': 'كلمة المرور المُنشأة',
  'password-generator.copy': 'نسخ',
  'password-generator.copied': 'تم النسخ!',
  'password-generator.regenerate': 'إعادة التوليد',
  'password-generator.length': 'طول:<x> {{طول}}</x>',
  'password-generator.lengthLabel': 'طول كلمة المرور',
  'password-generator.toggle.uppercase': 'الأحرف الكبيرة (AZ)',
  'password-generator.toggle.lowercase': '(az)',
  'password-generator.toggle.digits': 'الأرقام (0-9)',
  'password-generator.toggle.symbols': 'الرموز (!@#…)',
  'password-generator.toggle.noSimilar': 'تخطي المتشابه (0/O/1/l/I)',
  'password-generator.toggle.noAmbiguous': 'تخطَّ الكلمات الغامضة (المسافة، علامات الاقتباس)',
  'password-generator.pick': 'استخدم كلمة المرور هذه',
}
