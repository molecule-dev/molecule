import type { AuthTranslations } from './types.js'

/** Auth translations for id. */
export const id: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'Gagal masuk',
  'auth.error.requestFailed': 'Permintaan gagal',
  'auth.error.registrationFailed': 'Pendaftaran gagal',
  'auth.error.noRefreshToken': 'Token penyegaran tidak tersedia.',
  'auth.error.profileRequiresSignIn': 'Masuk terlebih dahulu sebelum memperbarui profil.',
  'auth.error.profileSessionChanged': 'Sesi profil berubah sebelum pengiriman.',
  'auth.error.passwordRequiresSignIn': 'Masuk terlebih dahulu sebelum mengubah kata sandi.',
  'auth.error.passwordSessionChanged': 'Sesi kata sandi diubah sebelum pengiriman.',
  'auth.error.requestTimedOut': 'Permintaan otentikasi habis waktu.',
}
