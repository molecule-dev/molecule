import type { AuthTranslations } from './types.js'

/** Auth translations for Bulgarian. */
export const bg: AuthTranslations = {
  'auth.error.requestFailed': 'Заявката е неуспешна',
  'auth.error.loginFailed': 'Неуспешно влизане',
  'auth.error.registrationFailed': 'Неуспешна регистрация',
  'auth.error.noRefreshToken': 'Няма наличен токен за опресняване',
  'auth.error.profileRequiresSignIn': 'Влезте, преди да актуализирате профил',
  'auth.error.profileSessionChanged': 'Сесията на профила се промени преди изпращането',
  'auth.error.passwordRequiresSignIn': 'Влезте, преди да промените паролата си',
  'auth.error.passwordSessionChanged': 'Паролата за сесията е променена преди изпращането',
}
