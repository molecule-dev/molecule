import type { AuthTranslations } from './types.js'

/** Auth translations for zh. */
export const zh: Partial<AuthTranslations> = {
  'auth.error.loginFailed': '登录失败',
  'auth.error.requestFailed': '请求失败',
  'auth.error.registrationFailed': '注册失败',
  'auth.error.noRefreshToken': '没有可用的刷新令牌',
  'auth.error.profileRequiresSignIn': '请先登录再更新个人资料',
  'auth.error.profileSessionChanged': '提交前个人资料会话已更改',
  'auth.error.passwordRequiresSignIn': '请先登录再更改密码',
  'auth.error.passwordSessionChanged': '提交前密码会话已更改',
}
