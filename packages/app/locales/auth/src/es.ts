import type { AuthTranslations } from './types.js'

/** Auth translations for es. */
export const es: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'Error de inicio de sesión',
  'auth.error.requestFailed': 'La solicitud falló.',
  'auth.error.registrationFailed': 'Falló el registro',
  'auth.error.noRefreshToken': 'No hay token de actualización disponible',
  'auth.error.profileRequiresSignIn': 'Inicia sesión antes de actualizar tu perfil.',
  'auth.error.profileSessionChanged': 'La sesión del perfil cambió antes de su envío.',
  'auth.error.passwordRequiresSignIn': 'Inicia sesión antes de cambiar tu contraseña.',
  'auth.error.passwordSessionChanged': 'La sesión de contraseña cambió antes del envío.',
  'auth.error.requestTimedOut': 'La solicitud de autenticación ha caducado.',
}
