import type { AuthTranslations } from './types.js'

/** Auth translations for uk. */
export const uk: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'Помилка входу',
  'auth.error.requestFailed': 'Запит не вдалося',
  'auth.error.registrationFailed': 'Реєстрація не вдалася',
  'auth.error.noRefreshToken': 'Немає доступного токена оновлення',
  'auth.error.profileRequiresSignIn': 'Увійдіть перед оновленням профілю',
  'auth.error.profileSessionChanged': 'Сеанс профілю змінився перед надсиланням',
  'auth.error.passwordRequiresSignIn': 'Увійдіть перед зміною пароля',
  'auth.error.passwordSessionChanged': 'Сеанс пароля змінено перед надсиланням',
}
