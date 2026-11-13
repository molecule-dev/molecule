import type { UserTranslations } from './types.js'

/** User translations for Afrikaans. */
export const af: UserTranslations = {
  'user.error.badRequest': 'Ongeldige versoek.',
  'user.error.notFound': 'Nie gevind nie.',
  'user.error.failedToCreateSession': 'Kon nie sessie skep nie.',
  'user.error.usernameRequired': 'Gebruikersnaam word vereis.',
  'user.error.passwordRequired': 'Wagwoord word vereis.',
  'user.error.emailInvalid': 'E-pos is ongeldig.',
  'user.error.usernameUnavailable': 'Gebruikersnaam is onbeskikbaar.',
  'user.error.emailAlreadyRegistered': 'E-pos is reeds geregistreer.',
  'user.error.failedToHashPassword': 'Kon nie wagwoord versleutel nie.',
  'user.error.invalidCredentials': 'Ongeldige magtigingsbewyse.',
  'user.error.invalidTwoFactorToken': 'Ongeldige tweefaktor-teken.',
  'user.error.twoFactorVerificationUnavailable': 'Tweefaktor-verifikasie onbeskikbaar.',
  'user.error.loginFailed': 'Aanmelding het misluk.',
  'user.notification.newLogin': 'Nuwe Aanmelding',
  'user.notification.newLoginBody': 'Nuwe aanmelding van {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Gebruikersnaam kan nie leeg wees nie.',
  'user.error.usernameInvalid':
    'Gebruikersnaam mag slegs letters, syfers, punte, koppeltekens en onderstrepe bevat.',
  'user.error.bodyNestedUnderUser':
    'Hierdie liggaam plaas sy velde onder "user"; stuur gebruikersnaam, e-pos en wagwoord op die boonste vlak.',
  'user.error.failedToUpdateUser': 'Kon nie gebruiker opdateer nie.',
  'user.error.failedToDeleteUser': 'Kon nie gebruiker verwyder nie.',
  'user.error.failedToReadUser': 'Kon nie gebruiker lees nie.',
  'user.error.emailRequired': 'E-pos word vereis.',
  'user.email.passwordResetSubject': '{{appName}} - Wagwoordherstel',
  'user.email.passwordResetText': 'Jou wagwoordherstelteken is: {{token}}',
  'user.email.passwordResetLink': 'Herstel jou wagwoord by: {{url}}',
  'user.email.passwordResetHtml': '<p>Jou wagwoordherstelteken is: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Herstel jou wagwoord</a></p>',
  'user.error.failedToProcessPasswordReset': 'Kon nie wagwoordherstel verwerk nie.',
  'user.error.newPasswordRequired': 'Nuwe wagwoord word vereis.',
  'user.error.currentPasswordRequired': 'Huidige wagwoord word vereis.',
  'user.error.currentPasswordIncorrect': 'Huidige wagwoord is verkeerd.',
  'user.error.failedToUpdatePassword': 'Kon nie wagwoord opdateer nie.',
  'user.error.planKeyRequired': 'planKey word vereis.',
  'user.error.invalidPlan': 'Ongeldige plan.',
  'user.error.failedToUpdateSubscription': 'Kon nie intekening opdateer nie.',
  'user.error.failedToUpdatePlan': 'Kon nie plan opdateer nie.',
  'user.error.twoFactorNotAvailable': 'Tweefaktor-verifikasie is nie beskikbaar nie.',
  'user.error.twoFactorRequiresPassword':
    'Tweefaktor-verifikasie is op hierdie rekening geaktiveer. Meld aan met jou e-pos en wagwoord om voort te gaan.',
  'user.error.tokenRequired': 'Teken word vereis.',
  'user.error.noPendingTwoFactorSetup':
    'Geen hangende tweefaktor-opstelling nie. Roep eers met aksie "setup" aan.',
  'user.error.invalidToken': 'Ongeldige teken.',
  'user.error.twoFactorRequired': "'n Tweefaktor-kode word vereis.",
  'user.error.twoFactorNotEnabled': 'Tweefaktor is nie geaktiveer nie.',
  'user.error.invalidAction': 'Ongeldige aksie. Gebruik "setup", "enable" of "disable".',
  'user.error.twoFactorOperationFailed': 'Tweefaktor-operasie het misluk.',
  'user.error.oauthServerNotConfigured': 'OAuth-bediener "{{server}}" is nie opgestel nie.',
  'user.error.oauthVerificationFailed': 'OAuth-verifikasie het misluk.',
  'user.error.failedToCreateUser': 'Kon nie gebruiker skep nie.',
  'user.error.oauthLoginFailed': 'OAuth-aanmelding het misluk.',
  'user.error.unauthorized': 'Ongemagtig',
  'user.error.passwordTooLong': 'Wagwoord moet hoogstens {{max}} karakters wees',
  'user.error.passwordTooShort': 'Wagwoord moet ten minste {{min}} karakters wees',
  'user.error.tooManyRequests': 'Te veel pogings. Wag asseblief en probeer weer.',
  'user.error.webhookUnauthorized': 'Kennisgewing van ongemagtigde betaling',
  'user.error.credentialsNested':
    'Hierdie aanmeld-eindpunt lees geloofsbriewe op die boonste vlak, maar hierdie liggaam nestel hulle onder {{envelope}}. Stel loginEndpoint na die roete wat hierdie koevert uitpak, of gebruik createRequestHandler met mapRequest om req.body[ {{envelope}}] uit te pak voor handlers.logIn.',
  'user.error.oauthStateMismatch': 'OAuth-statuswanverhouding — moontlike CSRF-aanval',
  'user.error.avatarTooLarge': 'Avatar moet {{max}} karakters of minder wees.',
  'user.error.bioTooLong': 'Biografie moet {{max}} karakters of minder wees.',
  'user.error.noUpdatableFields': 'Geen opdateerbare velde is verskaf nie.',
  'user.error.oauthDataInvalid': "oauthData moet 'n objek wees.",
  'user.error.subscriptionActivationRequiresVerification':
    'Subskripsieaktivering moet deur kwitansieverifikasie gaan — gebruik POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount':
    'Geen {{provider}}-faktureringsrekening vir hierdie gebruiker gevind nie.',
  'user.payment.portalFailed': 'Kon nie die {{provider}}-faktureringportaal oopmaak nie.',
  'user.payment.portalNotSupported': "{{provider}} bied nie 'n faktureringsportaal aan nie.",
  'user.payment.subscriptionOwnershipMismatch':
    'Hierdie intekening behoort nie aan jou rekening nie.',
  'user.payment.transactionAlreadyClaimed':
    "Hierdie aankoop is reeds met 'n ander rekening geassosieer.",
  'user.error.completeTargetMissing':
    'Geen rekening bestaan met die ID wat as volledigeId verskaf is nie.',
  'user.error.completeIdentityMismatch':
    'Die verskafde gebruikersnaam of e-posadres identifiseer nie die completeId-rekening nie.',
  'user.error.completeNotOwned':
    'Die completeId-rekening teken aan deur OAuth; die geloofsbriewe daarvan word nie hier verskaf nie.',
  'user.error.identityRequired':
    "Voorsiening benodig 'n gebruikersnaam of 'n e-posadres om die rekening te identifiseer.",
  'user.error.usernameEmailConflict':
    'Die gebruikersnaam en die e-posadres behoort aan twee verskillende bestaande rekeninge.',
  'user.error.oauthEmailCollision':
    "'n Rekening bestaan reeds vir hierdie e-posadres. Meld asseblief aan met jou oorspronklike metode en koppel dan hierdie verskaffer vanaf jou rekeninginstellings.",
}
