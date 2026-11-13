import type { AuthTranslations } from './types.js'

/** Auth translations for hi. */
export const hi: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'लॉगिन विफल',
  'auth.error.requestFailed': 'अनुरोध विफल रहा',
  'auth.error.registrationFailed': 'पंजीकरण विफल रहा',
  'auth.error.noRefreshToken': 'कोई रिफ्रेश टोकन उपलब्ध नहीं है',
  'auth.error.profileRequiresSignIn': 'प्रोफ़ाइल अपडेट करने से पहले साइन इन करें',
  'auth.error.profileSessionChanged': 'सबमिशन से पहले प्रोफ़ाइल सत्र में बदलाव हुआ।',
  'auth.error.passwordRequiresSignIn': 'पासवर्ड बदलने से पहले साइन इन करें',
  'auth.error.passwordSessionChanged': 'सबमिशन से पहले पासवर्ड सेशन बदल गया था',
}
