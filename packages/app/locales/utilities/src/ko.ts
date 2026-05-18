import type { UtilitiesTranslations } from './types.js'

/** Utilities translations for ko. */
export const ko: Partial<UtilitiesTranslations> = {
  'error.unknown': '예기치 않은 오류가 발생했습니다.',
  'error.networkError': '네트워크 오류가 발생했습니다. 연결 상태를 확인해 주세요.',
  'error.timeout': '요청 시간이 초과되었습니다. 다시 시도해 주세요.',
  'error.unauthorized': '귀하는 이 작업을 수행할 권한이 없습니다.',
  'error.forbidden': '접근 불가.',
  'error.notFound': '리소스를 찾을 수 없습니다.',
  'error.validationError': '입력하신 내용을 확인하시고 다시 시도해 주세요.',
  'error.serverError': '서버 오류입니다. 나중에 다시 시도해 주세요.',
}
