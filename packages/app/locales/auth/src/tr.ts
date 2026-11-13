import type { AuthTranslations } from './types.js'

/** Auth translations for tr. */
export const tr: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'Giriş başarısız',
  'auth.error.requestFailed': 'İstek başarısız oldu',
  'auth.error.registrationFailed': 'Kayıt işlemi başarısız oldu.',
  'auth.error.noRefreshToken': 'Yenileme belirteci mevcut değil.',
  'auth.error.profileRequiresSignIn': 'Profilinizi güncellemeden önce lütfen giriş yapın.',
  'auth.error.profileSessionChanged': 'Profil oturumu gönderimden önce değişti.',
  'auth.error.passwordRequiresSignIn': 'Şifrenizi değiştirmeden önce oturum açın.',
  'auth.error.passwordSessionChanged': 'Gönderimden önce parola oturumu değiştirildi.',
}
