import type { ConfigTranslations } from './types.js'

/** Config translations for Korean. */
export const ko: ConfigTranslations = {
  'config.error.required': "필수 구성 '{{key}}'이(가) 설정되지 않았습니다.",
  'config.error.mustBeNumber': "구성 '{{key}}'은(는) 숫자여야 합니다.",
  'config.error.minValue': "구성 '{{key}}'은(는) 최소 {{min}}이어야 합니다.",
  'config.error.maxValue': "구성 '{{key}}'은(는) 최대 {{max}}이어야 합니다.",
  'config.error.mustBeBoolean': "구성 '{{key}}'은(는) 부울 값이어야 합니다 (true/false/1/0).",
  'config.error.mustBeJson': "구성 '{{key}}'은(는) 유효한 JSON이어야 합니다.",
  'config.error.patternMismatch':
    "구성 '{{key}}'이(가) 패턴 '{{pattern}}'과(와) 일치하지 않습니다.",
  'config.error.invalidEnum': "구성 '{{key}}'은(는) 다음 중 하나여야 합니다: {{values}}.",
  'config.error.validationNotSupported': '현재 구성 공급자는 유효성 검사를 지원하지 않습니다.',
}
