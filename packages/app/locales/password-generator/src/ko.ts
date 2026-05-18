import type { PasswordGeneratorTranslations } from './types.js'

/** PasswordGenerator translations for ko. */
export const ko: Partial<PasswordGeneratorTranslations> = {
  'password-generator.readoutLabel': '생성된 비밀번호',
  'password-generator.copy': '복사',
  'password-generator.copied': '복사되었습니다!',
  'password-generator.regenerate': '다시 생성',
  'password-generator.length': '길이:<x> {{길이}}</x>',
  'password-generator.lengthLabel': '비밀번호 길이',
  'password-generator.toggle.uppercase': '대문자(AZ)',
  'password-generator.toggle.lowercase': '소문자(az)',
  'password-generator.toggle.digits': '숫자 (0-9)',
  'password-generator.toggle.symbols': '기호(!@#…)',
  'password-generator.toggle.noSimilar': '유사한 항목(0/O/1/l/I)은 건너뛰세요.',
  'password-generator.toggle.noAmbiguous': '모호한 부분(공백, 따옴표)은 건너뛰세요.',
  'password-generator.pick': '이 비밀번호를 사용하세요',
}
