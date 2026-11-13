import type { UserTranslations } from './types.js'

/** User translations for German. */
export const de: UserTranslations = {
  'user.error.badRequest': 'Ungültige Anfrage.',
  'user.error.notFound': 'Nicht gefunden.',
  'user.error.failedToCreateSession': 'Sitzung konnte nicht erstellt werden.',
  'user.error.usernameRequired': 'Benutzername ist erforderlich.',
  'user.error.passwordRequired': 'Passwort ist erforderlich.',
  'user.error.emailInvalid': 'E-Mail ist ungültig.',
  'user.error.usernameUnavailable': 'Benutzername ist nicht verfügbar.',
  'user.error.emailAlreadyRegistered': 'E-Mail ist bereits registriert.',
  'user.error.failedToHashPassword': 'Passwort konnte nicht gehasht werden.',
  'user.error.invalidCredentials': 'Ungültige Anmeldedaten.',
  'user.error.invalidTwoFactorToken': 'Ungültiges Zwei-Faktor-Token.',
  'user.error.twoFactorVerificationUnavailable': 'Zwei-Faktor-Verifizierung nicht verfügbar.',
  'user.error.loginFailed': 'Anmeldung fehlgeschlagen.',
  'user.notification.newLogin': 'Neue Anmeldung',
  'user.notification.newLoginBody': 'Neue Anmeldung von {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Benutzername darf nicht leer sein.',
  'user.error.usernameInvalid':
    'Der Benutzername darf nur Buchstaben, Ziffern, Punkte, Bindestriche und Unterstriche enthalten.',
  'user.error.bodyNestedUnderUser':
    'Dieser Body verschachtelt seine Felder unter "user"; sende Benutzername, E-Mail und Passwort auf oberster Ebene.',
  'user.error.failedToUpdateUser': 'Benutzer konnte nicht aktualisiert werden.',
  'user.error.failedToDeleteUser': 'Benutzer konnte nicht gelöscht werden.',
  'user.error.failedToReadUser': 'Benutzer konnte nicht gelesen werden.',
  'user.error.emailRequired': 'E-Mail ist erforderlich.',
  'user.email.passwordResetSubject': '{{appName}} - Passwort zurücksetzen',
  'user.email.passwordResetText': 'Ihr Token zum Zurücksetzen des Passworts lautet: {{token}}',
  'user.email.passwordResetLink': 'Setzen Sie Ihr Passwort zurück unter: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Ihr Token zum Zurücksetzen des Passworts lautet: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Passwort zurücksetzen</a></p>',
  'user.error.failedToProcessPasswordReset':
    'Passwortzurücksetzung konnte nicht verarbeitet werden.',
  'user.error.newPasswordRequired': 'Neues Passwort ist erforderlich.',
  'user.error.currentPasswordRequired': 'Aktuelles Passwort ist erforderlich.',
  'user.error.currentPasswordIncorrect': 'Aktuelles Passwort ist falsch.',
  'user.error.failedToUpdatePassword': 'Passwort konnte nicht aktualisiert werden.',
  'user.error.planKeyRequired': 'planKey ist erforderlich.',
  'user.error.invalidPlan': 'Ungültiger Tarif.',
  'user.error.failedToUpdateSubscription': 'Abonnement konnte nicht aktualisiert werden.',
  'user.error.failedToUpdatePlan': 'Tarif konnte nicht aktualisiert werden.',
  'user.error.twoFactorNotAvailable': 'Zwei-Faktor-Authentifizierung ist nicht verfügbar.',
  'user.error.twoFactorRequiresPassword':
    'Zwei-Faktor-Authentifizierung ist für dieses Konto aktiviert. Melden Sie sich mit E-Mail und Passwort an, um fortzufahren.',
  'user.error.tokenRequired': 'Token ist erforderlich.',
  'user.error.noPendingTwoFactorSetup':
    'Keine ausstehende Zwei-Faktor-Einrichtung. Rufen Sie zuerst mit der Aktion "setup" auf.',
  'user.error.invalidToken': 'Ungültiges Token.',
  'user.error.twoFactorRequired': 'Ein Zwei-Faktor-Code ist erforderlich.',
  'user.error.twoFactorNotEnabled': 'Zwei-Faktor ist nicht aktiviert.',
  'user.error.invalidAction': 'Ungültige Aktion. Verwenden Sie "setup", "enable" oder "disable".',
  'user.error.twoFactorOperationFailed': 'Zwei-Faktor-Vorgang fehlgeschlagen.',
  'user.error.oauthServerNotConfigured': 'OAuth-Server "{{server}}" ist nicht konfiguriert.',
  'user.error.oauthVerificationFailed': 'OAuth-Verifizierung fehlgeschlagen.',
  'user.error.failedToCreateUser': 'Benutzer konnte nicht erstellt werden.',
  'user.error.oauthLoginFailed': 'OAuth-Anmeldung fehlgeschlagen.',
  'user.error.unauthorized': 'Nicht autorisiert',
  'user.error.passwordTooLong': 'Das Passwort darf maximal {{max}} Zeichen lang sein.',
  'user.error.passwordTooShort': 'Das Passwort muss mindestens {{min}} Zeichen lang sein.',
  'user.error.tooManyRequests': 'Zu viele Versuche. Bitte warten Sie und versuchen Sie es erneut.',
  'user.error.webhookUnauthorized': 'Benachrichtigung über unautorisierte Zahlung',
  'user.error.credentialsNested':
    'Dieser Anmelde-Endpunkt liest die Anmeldeinformationen auf oberster Ebene, der Anfragetext verschachtelt sie jedoch unter {{envelope}}. Setzen Sie loginEndpoint auf die Route, die diesen Umschlag entpackt, oder verwenden Sie createRequestHandler mit mapRequest, um req.body[ {{envelope}}] vor handlers.logIn zu entpacken.',
  'user.error.oauthStateMismatch': 'OAuth-Statuskonflikt – möglicher CSRF-Angriff',
  'user.error.avatarTooLarge': 'Der Avatar darf {{max}} Zeichen oder weniger enthalten.',
  'user.error.bioTooLong': 'Die Biografie darf {{max}} Zeichen lang sein.',
  'user.error.noUpdatableFields': 'Es wurden keine aktualisierbaren Felder bereitgestellt.',
  'user.error.oauthDataInvalid': 'oauthData muss ein Objekt sein.',
  'user.error.subscriptionActivationRequiresVerification':
    'Die Aktivierung des Abonnements muss über eine Zahlungsbestätigung erfolgen – verwenden Sie dazu POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount':
    'Für diesen Benutzer wurde kein {{provider}} Abrechnungskonto gefunden.',
  'user.payment.portalFailed': 'Das Abrechnungsportal {{provider}} konnte nicht geöffnet werden.',
  'user.payment.portalNotSupported': '{{provider}} bietet kein Abrechnungsportal an.',
  'user.payment.subscriptionOwnershipMismatch': 'Dieses Abonnement gehört nicht zu Ihrem Konto.',
  'user.payment.transactionAlreadyClaimed':
    'Dieser Kauf ist bereits einem anderen Konto zugeordnet.',
  'user.error.completeTargetMissing': 'Es existiert kein Konto mit der angegebenen ID completeId.',
  'user.error.completeIdentityMismatch':
    'Der angegebene Benutzername oder die E-Mail-Adresse identifiziert nicht das completeId-Konto.',
  'user.error.completeNotOwned':
    'Das completeId-Konto meldet sich über OAuth an; seine Anmeldeinformationen werden nicht hier bereitgestellt.',
  'user.error.identityRequired':
    'Für die Bereitstellung wird ein Benutzername oder eine E-Mail-Adresse zur Identifizierung des Kontos benötigt.',
  'user.error.usernameEmailConflict':
    'Der Benutzername und die E-Mail-Adresse gehören zu zwei verschiedenen bestehenden Konten.',
  'user.error.oauthEmailCollision':
    'Für diese E-Mail-Adresse existiert bereits ein Konto. Bitte melden Sie sich mit Ihrer gewohnten Methode an und verknüpfen Sie diesen Anbieter anschließend in Ihren Kontoeinstellungen.',
}
