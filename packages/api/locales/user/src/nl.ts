import type { UserTranslations } from './types.js'

/** User translations for Dutch. */
export const nl: UserTranslations = {
  'user.error.badRequest': 'Ongeldig verzoek.',
  'user.error.notFound': 'Niet gevonden.',
  'user.error.failedToCreateSession': 'Kon sessie niet aanmaken.',
  'user.error.usernameRequired': 'Gebruikersnaam is vereist.',
  'user.error.passwordRequired': 'Wachtwoord is vereist.',
  'user.error.emailInvalid': 'E-mail is ongeldig.',
  'user.error.usernameUnavailable': 'Gebruikersnaam is niet beschikbaar.',
  'user.error.emailAlreadyRegistered': 'E-mail is al geregistreerd.',
  'user.error.failedToHashPassword': 'Kon wachtwoord niet hashen.',
  'user.error.invalidCredentials': 'Ongeldige inloggegevens.',
  'user.error.invalidTwoFactorToken': 'Ongeldig tweefactor-token.',
  'user.error.twoFactorVerificationUnavailable': 'Tweefactor-verificatie niet beschikbaar.',
  'user.error.loginFailed': 'Inloggen mislukt.',
  'user.notification.newLogin': 'Nieuwe aanmelding',
  'user.notification.newLoginBody': 'Nieuwe aanmelding vanaf {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Gebruikersnaam mag niet leeg zijn.',
  'user.error.usernameInvalid':
    'Een gebruikersnaam mag alleen letters, cijfers, punten, koppeltekens en underscores bevatten.',
  'user.error.bodyNestedUnderUser':
    'Deze body nest zijn velden onder "user"; stuur gebruikersnaam, e-mail en wachtwoord op het hoogste niveau.',
  'user.error.failedToUpdateUser': 'Kon gebruiker niet bijwerken.',
  'user.error.failedToDeleteUser': 'Kon gebruiker niet verwijderen.',
  'user.error.failedToReadUser': 'Kon gebruiker niet lezen.',
  'user.error.emailRequired': 'E-mail is vereist.',
  'user.email.passwordResetSubject': '{{appName}} - Wachtwoord opnieuw instellen',
  'user.email.passwordResetText':
    'Uw token voor het opnieuw instellen van het wachtwoord is: {{token}}',
  'user.email.passwordResetLink': 'Stel uw wachtwoord opnieuw in op: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Uw token voor het opnieuw instellen van het wachtwoord is: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Stel uw wachtwoord opnieuw in</a></p>',
  'user.error.failedToProcessPasswordReset': 'Kon wachtwoordherstel niet verwerken.',
  'user.error.newPasswordRequired': 'Nieuw wachtwoord is vereist.',
  'user.error.currentPasswordRequired': 'Huidig wachtwoord is vereist.',
  'user.error.currentPasswordIncorrect': 'Huidig wachtwoord is onjuist.',
  'user.error.failedToUpdatePassword': 'Kon wachtwoord niet bijwerken.',
  'user.error.planKeyRequired': 'planKey is vereist.',
  'user.error.invalidPlan': 'Ongeldig plan.',
  'user.error.failedToUpdateSubscription': 'Kon abonnement niet bijwerken.',
  'user.error.failedToUpdatePlan': 'Kon plan niet bijwerken.',
  'user.error.twoFactorNotAvailable': 'Tweefactor-authenticatie is niet beschikbaar.',
  'user.error.twoFactorRequiresPassword':
    'Tweefactor-authenticatie is ingeschakeld voor dit account. Log in met je e-mailadres en wachtwoord om door te gaan.',
  'user.error.tokenRequired': 'Token is vereist.',
  'user.error.noPendingTwoFactorSetup':
    'Geen openstaande tweefactor-instelling. Roep eerst aan met de actie "setup".',
  'user.error.invalidToken': 'Ongeldig token.',
  'user.error.twoFactorRequired': 'Een tweefactor-code is vereist.',
  'user.error.twoFactorNotEnabled': 'Tweefactor is niet ingeschakeld.',
  'user.error.invalidAction': 'Ongeldige actie. Gebruik "setup", "enable" of "disable".',
  'user.error.twoFactorOperationFailed': 'Tweefactor-operatie mislukt.',
  'user.error.oauthServerNotConfigured': 'OAuth-server "{{server}}" is niet geconfigureerd.',
  'user.error.oauthVerificationFailed': 'OAuth-verificatie mislukt.',
  'user.error.failedToCreateUser': 'Kon gebruiker niet aanmaken.',
  'user.error.oauthLoginFailed': 'OAuth-aanmelding mislukt.',
  'user.error.unauthorized': 'Niet geautoriseerd',
  'user.error.passwordTooLong': 'Het wachtwoord mag maximaal {{max}} tekens lang zijn.',
  'user.error.passwordTooShort': 'Het wachtwoord moet minimaal {{min}} tekens lang zijn.',
  'user.error.tooManyRequests': 'Te veel pogingen. Wacht even en probeer het opnieuw.',
  'user.error.webhookUnauthorized': 'Melding van ongeautoriseerde betaling',
  'user.error.credentialsNested':
    'Dit inlog-eindpunt leest de inloggegevens op het hoogste niveau, maar deze body nestelt ze onder {{envelope}}. Stel loginEndpoint in op de route die deze envelope uitpakt, of gebruik createRequestHandler met mapRequest om req.body[ {{envelope}}] uit te pakken vóór handlers.logIn.',
  'user.error.oauthStateMismatch': 'OAuth-status komt niet overeen — mogelijk een CSRF-aanval',
  'user.error.avatarTooLarge': 'De avatar mag maximaal {{max}} tekens lang zijn.',
  'user.error.bioTooLong': 'De bio mag maximaal {{max}} tekens lang zijn.',
  'user.error.noUpdatableFields': 'Er zijn geen velden opgegeven die bijgewerkt kunnen worden.',
  'user.error.oauthDataInvalid': 'oauthData moet een object zijn.',
  'user.error.subscriptionActivationRequiresVerification':
    'Abonnementsactivering vereist verificatie van de ontvangstbevestiging — gebruik POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount':
    'Er is geen factureringsaccount {{provider}} gevonden voor deze gebruiker.',
  'user.payment.portalFailed': 'Het factureringportaal {{provider}} kon niet worden geopend.',
  'user.payment.portalNotSupported': '{{provider}} biedt geen factureringsportaal aan.',
  'user.payment.subscriptionOwnershipMismatch': 'Dit abonnement hoort niet bij uw account.',
  'user.payment.transactionAlreadyClaimed': 'Deze aankoop is al gekoppeld aan een ander account.',
  'user.error.completeTargetMissing': 'Er bestaat geen account met de opgegeven ID als completeId.',
  'user.error.completeIdentityMismatch':
    'De opgegeven gebruikersnaam of het e-mailadres identificeert het completeId-account niet.',
  'user.error.completeNotOwned':
    'Het completeId-account meldt zich aan via OAuth; de inloggegevens worden hier niet verstrekt.',
  'user.error.identityRequired':
    'Voor het aanmaken van een account is een gebruikersnaam of e-mailadres nodig ter identificatie.',
  'user.error.usernameEmailConflict':
    'De gebruikersnaam en het e-mailadres behoren tot twee verschillende bestaande accounts.',
  'user.error.oauthEmailCollision':
    'Er bestaat al een account voor dit e-mailadres. Meld u eerst aan met uw oorspronkelijke methode en koppel vervolgens deze provider in uw accountinstellingen.',
}
