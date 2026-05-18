import type { PasswordGeneratorTranslations } from './types.js'

/** PasswordGenerator translations for ja. */
export const ja: Partial<PasswordGeneratorTranslations> = {
  'password-generator.readoutLabel': '生成されたパスワード',
  'password-generator.copy': 'コピー',
  'password-generator.copied': 'コピーしました！',
  'password-generator.regenerate': '再生成',
  'password-generator.length': '長さ：<x> {{長さ}}</x>',
  'password-generator.lengthLabel': 'パスワードの長さ',
  'password-generator.toggle.uppercase': '大文字 (AZ)',
  'password-generator.toggle.lowercase': '小文字 (az)',
  'password-generator.toggle.digits': '数字（0～9）',
  'password-generator.toggle.symbols': '記号（!@#…）',
  'password-generator.toggle.noSimilar': '類似の項目をスキップ (0/O/1/l/I)',
  'password-generator.toggle.noAmbiguous': '曖昧な文字列（スペース、引用符など）をスキップする',
  'password-generator.pick': 'このパスワードを使用してください',
}
