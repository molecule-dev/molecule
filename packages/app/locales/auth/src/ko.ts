import type { AuthTranslations } from './types.js'

/** Auth translations for ko. */
export const ko: Partial<AuthTranslations> = {
  'auth.error.loginFailed': '로그인 실패',
  'auth.error.requestFailed': '요청 실패',
  'auth.error.registrationFailed': '등록 실패',
  'auth.error.noRefreshToken': '새로 고침 토큰을 사용할 수 없습니다.',
  'auth.error.profileRequiresSignIn': '프로필을 업데이트하기 전에 로그인하세요.',
  'auth.error.profileSessionChanged': '제출 전에 프로필 세션이 변경되었습니다.',
  'auth.error.passwordRequiresSignIn': '비밀번호를 변경하기 전에 로그인하세요.',
  'auth.error.passwordSessionChanged': '제출 전에 비밀번호 세션이 변경되었습니다.',
  'auth.error.requestTimedOut': '인증 요청 시간이 초과되었습니다.',
}
