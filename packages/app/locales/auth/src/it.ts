import type { AuthTranslations } from './types.js'

/** Auth translations for it. */
export const it: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'Accesso non riuscito',
  'auth.error.requestFailed': 'Richiesta non riuscita',
  'auth.error.registrationFailed': 'Registrazione non riuscita',
  'auth.error.noRefreshToken': 'Nessun token di aggiornamento disponibile',
  'auth.error.profileRequiresSignIn': 'Accedi prima di aggiornare il profilo.',
  'auth.error.profileSessionChanged': "La sessione del profilo è cambiata prima dell'invio.",
  'auth.error.passwordRequiresSignIn': 'Accedi prima di cambiare la password',
  'auth.error.passwordSessionChanged':
    "La password della sessione è stata modificata prima dell'invio.",
}
