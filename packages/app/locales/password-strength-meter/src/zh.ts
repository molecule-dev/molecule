import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for zh. */
export const zh: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': '至少 12 个字符',
  'passwordStrengthMeter.label.0': '非常弱',
  'passwordStrengthMeter.label.1': '虚弱的',
  'passwordStrengthMeter.label.2': '公平的',
  'passwordStrengthMeter.label.3': '好的',
  'passwordStrengthMeter.label.4': '强的',
  'passwordStrengthMeter.ariaValueText': '密码强度：<x> {{标签}}</x> （<x> {{分数}}</x> 4）',
  'passwordStrengthMeter.rule.upper': '包含大写字母',
  'passwordStrengthMeter.rule.lower': '包含小写字母',
  'passwordStrengthMeter.rule.digit': '包含一个数字',
  'passwordStrengthMeter.rule.symbol': '包含一个符号',
  'passwordStrengthMeter.rule.noCommon': '不常见的密码',
}
