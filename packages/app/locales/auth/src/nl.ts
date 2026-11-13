import type { AuthTranslations } from './types.js'

/** Auth translations for nl. */
export const nl: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'Aanmelden mislukt',
  'auth.error.requestFailed': 'Verzoek mislukt',
  'auth.error.registrationFailed': 'Registratie mislukt',
  'auth.error.noRefreshToken': 'Geen vernieuwingstoken beschikbaar',
  'auth.error.profileRequiresSignIn': 'Meld u aan voordat u een profiel bijwerkt.',
  'auth.error.profileSessionChanged': 'De profielsessie is gewijzigd vóór indiening.',
  'auth.error.passwordRequiresSignIn': 'Meld u aan voordat u uw wachtwoord wijzigt.',
  'auth.error.passwordSessionChanged':
    'Het wachtwoord van de sessie is gewijzigd vóór het verzenden.',
}
