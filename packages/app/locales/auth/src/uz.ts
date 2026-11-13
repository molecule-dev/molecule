import type { AuthTranslations } from './types.js'

/** Auth translations for uz. */
export const uz: Partial<AuthTranslations> = {
  'auth.error.noRefreshToken': 'Yangilash tokeni mavjud emas',
  'auth.error.requestFailed': "So'rov bajarilmadi",
  'auth.error.loginFailed': 'tizimga kirishda xatolik yuz berdi',
  'auth.error.registrationFailed': "Ro'yxatdan o'tish amalga oshmadi",
  'auth.error.profileRequiresSignIn': 'Profilni yangilashdan oldin tizimga kiring',
  'auth.error.profileSessionChanged': "Profil sessiyasi topshirishdan oldin o'zgartirildi",
  'auth.error.passwordRequiresSignIn': "Parolni o'zgartirishdan oldin tizimga kiring",
  'auth.error.passwordSessionChanged': "Parol sessiyasi yuborishdan oldin o'zgartirildi",
}
