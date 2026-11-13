import type { AuthTranslations } from './types.js'

/** Auth translations for ja. */
export const ja: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'ログインに失敗しました',
  'auth.error.requestFailed': 'リクエストが失敗しました',
  'auth.error.registrationFailed': '登録に失敗しました',
  'auth.error.noRefreshToken': 'リフレッシュトークンがありません',
  'auth.error.profileRequiresSignIn': 'プロフィールを更新する前にログインしてください',
  'auth.error.profileSessionChanged': 'プロファイルセッションは送信前に変更されました',
  'auth.error.passwordRequiresSignIn': 'パスワードを変更する前にサインインしてください',
  'auth.error.passwordSessionChanged': '送信前にパスワードセッションが変更されました',
  'auth.error.requestTimedOut': '認証要求がタイムアウトしました',
}
