import type { UserTranslations } from './types.js'

/** User translations for Polish. */
export const pl: UserTranslations = {
  'user.error.badRequest': 'Nieprawidłowe żądanie.',
  'user.error.notFound': 'Nie znaleziono.',
  'user.error.failedToCreateSession': 'Nie udało się utworzyć sesji.',
  'user.error.usernameRequired': 'Nazwa użytkownika jest wymagana.',
  'user.error.passwordRequired': 'Hasło jest wymagane.',
  'user.error.emailInvalid': 'Adres e-mail jest nieprawidłowy.',
  'user.error.usernameUnavailable': 'Nazwa użytkownika jest niedostępna.',
  'user.error.emailAlreadyRegistered': 'Adres e-mail jest już zarejestrowany.',
  'user.error.failedToHashPassword': 'Nie udało się zahashować hasła.',
  'user.error.invalidCredentials': 'Nieprawidłowe poświadczenia.',
  'user.error.invalidTwoFactorToken': 'Nieprawidłowy token dwuskładnikowy.',
  'user.error.twoFactorVerificationUnavailable': 'Weryfikacja dwuskładnikowa niedostępna.',
  'user.error.loginFailed': 'Logowanie nie powiodło się.',
  'user.notification.newLogin': 'Nowe logowanie',
  'user.notification.newLoginBody': 'Nowe logowanie z {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Nazwa użytkownika nie może być pusta.',
  'user.error.usernameInvalid':
    'Nazwa użytkownika może zawierać tylko litery, cyfry, kropki, myślniki i podkreślenia.',
  'user.error.bodyNestedUnderUser':
    'To ciało zagnieżdża swoje pola pod "user"; wyślij nazwę użytkownika, e-mail i hasło na najwyższym poziomie.',
  'user.error.failedToUpdateUser': 'Nie udało się zaktualizować użytkownika.',
  'user.error.failedToDeleteUser': 'Nie udało się usunąć użytkownika.',
  'user.error.failedToReadUser': 'Nie udało się odczytać użytkownika.',
  'user.error.emailRequired': 'Adres e-mail jest wymagany.',
  'user.email.passwordResetSubject': '{{appName}} - Resetowanie hasła',
  'user.email.passwordResetText': 'Twój token resetowania hasła to: {{token}}',
  'user.email.passwordResetLink': 'Zresetuj hasło pod adresem: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Twój token resetowania hasła to: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Zresetuj hasło</a></p>',
  'user.error.failedToProcessPasswordReset': 'Nie udało się przetworzyć resetowania hasła.',
  'user.error.newPasswordRequired': 'Nowe hasło jest wymagane.',
  'user.error.currentPasswordRequired': 'Obecne hasło jest wymagane.',
  'user.error.currentPasswordIncorrect': 'Obecne hasło jest nieprawidłowe.',
  'user.error.failedToUpdatePassword': 'Nie udało się zaktualizować hasła.',
  'user.error.planKeyRequired': 'planKey jest wymagany.',
  'user.error.invalidPlan': 'Nieprawidłowy plan.',
  'user.error.failedToUpdateSubscription': 'Nie udało się zaktualizować subskrypcji.',
  'user.error.failedToUpdatePlan': 'Nie udało się zaktualizować planu.',
  'user.error.twoFactorNotAvailable': 'Uwierzytelnianie dwuskładnikowe nie jest dostępne.',
  'user.error.twoFactorRequiresPassword':
    'Uwierzytelnianie dwuskładnikowe jest włączone na tym koncie. Zaloguj się za pomocą adresu e-mail i hasła, aby kontynuować.',
  'user.error.tokenRequired': 'Token jest wymagany.',
  'user.error.noPendingTwoFactorSetup':
    'Brak oczekującej konfiguracji dwuskładnikowej. Najpierw wywołaj z akcją "setup".',
  'user.error.invalidToken': 'Nieprawidłowy token.',
  'user.error.twoFactorRequired': 'Wymagany jest kod dwuskładnikowy.',
  'user.error.twoFactorNotEnabled': 'Uwierzytelnianie dwuskładnikowe nie jest włączone.',
  'user.error.invalidAction': 'Nieprawidłowa akcja. Użyj "setup", "enable" lub "disable".',
  'user.error.twoFactorOperationFailed': 'Operacja dwuskładnikowa nie powiodła się.',
  'user.error.oauthServerNotConfigured': 'Serwer OAuth "{{server}}" nie jest skonfigurowany.',
  'user.error.oauthVerificationFailed': 'Weryfikacja OAuth nie powiodła się.',
  'user.error.failedToCreateUser': 'Nie udało się utworzyć użytkownika.',
  'user.error.oauthLoginFailed': 'Logowanie OAuth nie powiodło się.',
  'user.error.unauthorized': 'Nieautoryzowane',
  'user.error.passwordTooLong': 'Hasło musi mieć maksymalnie {{max}} znaków',
  'user.error.passwordTooShort': 'Hasło musi mieć co najmniej {{min}} znaków',
  'user.error.tooManyRequests': 'Zbyt wiele prób. Poczekaj i spróbuj ponownie.',
  'user.error.webhookUnauthorized': 'Powiadomienie o nieautoryzowanej płatności',
  'user.error.credentialsNested':
    'Ten punkt końcowy logowania odczytuje dane uwierzytelniające na najwyższym poziomie, ale ten element zagnieżdża je w {{envelope}}. Ustaw loginEndpoint na trasę, która rozpakowuje tę kopertę, lub użyj createRequestHandler z mapRequest, aby rozpakować req.body[ {{envelope}}] przed handlers.logIn.',
  'user.error.oauthStateMismatch': 'Niezgodność stanu OAuth — możliwy atak CSRF',
  'user.error.avatarTooLarge': 'Awatar może mieć maksymalnie {{max}} znaków.',
  'user.error.bioTooLong': 'Opis biograficzny musi mieć {{max}} znaków lub mniej.',
  'user.error.noUpdatableFields': 'Nie podano pól możliwych do aktualizacji.',
  'user.error.oauthDataInvalid': 'oauthData musi być obiektem.',
  'user.error.subscriptionActivationRequiresVerification':
    'Aktywacja subskrypcji musi przejść przez proces weryfikacji pokwitowania — użyj polecenia POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount':
    'Nie znaleziono konta rozliczeniowego {{provider}} dla tego użytkownika.',
  'user.payment.portalFailed': 'Nie można otworzyć portalu rozliczeniowego {{provider}} .',
  'user.payment.portalNotSupported': '{{provider}} nie oferuje portalu rozliczeniowego.',
  'user.payment.subscriptionOwnershipMismatch': 'Ta subskrypcja nie jest częścią Twojego konta.',
  'user.payment.transactionAlreadyClaimed': 'Ten zakup jest już powiązany z innym kontem.',
  'user.error.completeTargetMissing':
    'Nie istnieje konto o identyfikatorze podanym jako completeId.',
  'user.error.completeIdentityMismatch':
    'Podana nazwa użytkownika lub adres e-mail nie identyfikują konta completeId.',
  'user.error.completeNotOwned':
    'Konto completeId loguje się za pomocą protokołu OAuth. Jego dane uwierzytelniające nie są tutaj udostępniane.',
  'user.error.identityRequired':
    'Do utworzenia konta potrzebna jest nazwa użytkownika lub adres e-mail w celu jego identyfikacji.',
  'user.error.usernameEmailConflict':
    'Nazwa użytkownika i adres e-mail należą do dwóch różnych kont.',
  'user.error.oauthEmailCollision':
    'Konto dla tego adresu e-mail już istnieje. Zaloguj się przy użyciu pierwotnej metody, a następnie połącz tego dostawcę w ustawieniach konta.',
}
