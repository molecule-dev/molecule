import type { AuthTranslations } from './types.js'

/** Auth translations for Serbian. */
export const sr: AuthTranslations = {
  'auth.error.requestFailed': 'Захтев није успео',
  'auth.error.loginFailed': 'Пријава није успела',
  'auth.error.registrationFailed': 'Регистрација није успела',
  'auth.error.noRefreshToken': 'Нема доступног токена за освежавање',
  'auth.error.profileRequiresSignIn': 'Пријавите се пре ажурирања профила',
  'auth.error.profileSessionChanged': 'Сесија профила је промењена пре слања',
  'auth.error.passwordRequiresSignIn': 'Пријавите се пре промене лозинке',
  'auth.error.passwordSessionChanged': 'Сесија лозинке је промењена пре слања',
}
