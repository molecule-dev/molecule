import type { PasswordGeneratorTranslations } from './types.js'

/** PasswordGenerator translations for zh. */
export const zh: Partial<PasswordGeneratorTranslations> = {
  'password-generator.readoutLabel': '已生成的密码',
  'password-generator.copy': '复制',
  'password-generator.copied': '已复制！',
  'password-generator.regenerate': '重新生成',
  'password-generator.length': '长度：<x> {{长度}}</x>',
  'password-generator.lengthLabel': '密码长度',
  'password-generator.toggle.uppercase': '大写字母 (AZ)',
  'password-generator.toggle.lowercase': '小写字母 (az)',
  'password-generator.toggle.digits': '数字（0-9）',
  'password-generator.toggle.symbols': '符号（!@#…）',
  'password-generator.toggle.noSimilar': '跳过类似项（0/0/1/l/I）',
  'password-generator.toggle.noAmbiguous': '省略歧义（空格、引号）',
  'password-generator.pick': '使用此密码',
}
