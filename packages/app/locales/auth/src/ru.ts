import type { AuthTranslations } from './types.js'

/** Auth translations for Russian. */
export const ru: AuthTranslations = {
  'auth.error.requestFailed': 'Запрос не удался',
  'auth.error.loginFailed': 'Вход не удался',
  'auth.error.registrationFailed': 'Регистрация не удалась',
  'auth.error.noRefreshToken': 'Нет доступного токена обновления',
  'auth.error.profileRequiresSignIn': 'Войдите в систему перед обновлением профиля.',
  'auth.error.profileSessionChanged': 'Сессия профиля была изменена перед отправкой.',
  'auth.error.passwordRequiresSignIn': 'Войдите в систему перед сменой пароля.',
  'auth.error.passwordSessionChanged': 'Пароль сессии был изменен перед отправкой.',
  'auth.error.requestTimedOut': 'Запрос на аутентификацию истек по времени.',
}
