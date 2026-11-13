import type { AuthTranslations } from './types.js'

/** Auth translations for fr. */
export const fr: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'Échec de la connexion',
  'auth.error.requestFailed': 'La requête a échoué',
  'auth.error.registrationFailed': "L'inscription a échoué",
  'auth.error.noRefreshToken': "Aucun jeton d'actualisation disponible",
  'auth.error.profileRequiresSignIn': 'Connectez-vous avant de mettre à jour un profil',
  'auth.error.profileSessionChanged': 'La session de profil a été modifiée avant la soumission.',
  'auth.error.passwordRequiresSignIn':
    'Veuillez vous connecter avant de modifier votre mot de passe.',
  'auth.error.passwordSessionChanged':
    'La session de mot de passe a été modifiée avant la soumission.',
  'auth.error.requestTimedOut': "La requête d'authentification a expiré.",
}
