import type { AuthTranslations } from './types.js'

/** Auth translations for pl. */
export const pl: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'Logowanie nie powiodło się',
  'auth.error.requestFailed': 'Żądanie nie powiodło się',
  'auth.error.registrationFailed': 'Rejestracja nie powiodła się',
  'auth.error.noRefreshToken': 'Brak dostępnego tokena odświeżania',
  'auth.error.profileRequiresSignIn': 'Zaloguj się przed aktualizacją profilu',
  'auth.error.profileSessionChanged': 'Sesja profilu została zmieniona przed wysłaniem',
  'auth.error.passwordRequiresSignIn': 'Zaloguj się przed zmianą hasła',
  'auth.error.passwordSessionChanged': 'Hasło sesji zostało zmienione przed wysłaniem',
  'auth.error.requestTimedOut': 'Żądanie uwierzytelnienia przekroczyło limit czasu',
}
