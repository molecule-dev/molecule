import type { UserTranslations } from './types.js'

/** User translations for Danish. */
export const da: UserTranslations = {
  'user.error.badRequest': 'Ugyldig forespørgsel.',
  'user.error.notFound': 'Ikke fundet.',
  'user.error.failedToCreateSession': 'Kunne ikke oprette session.',
  'user.error.usernameRequired': 'Brugernavn er påkrævet.',
  'user.error.passwordRequired': 'Adgangskode er påkrævet.',
  'user.error.emailInvalid': 'E-mail er ugyldig.',
  'user.error.usernameUnavailable': 'Brugernavn er ikke tilgængeligt.',
  'user.error.emailAlreadyRegistered': 'E-mail er allerede registreret.',
  'user.error.failedToHashPassword': 'Kunne ikke hashe adgangskode.',
  'user.error.invalidCredentials': 'Ugyldige legitimationsoplysninger.',
  'user.error.invalidTwoFactorToken': 'Ugyldigt to-faktor-token.',
  'user.error.twoFactorVerificationUnavailable': 'To-faktor-verifikation utilgængelig.',
  'user.error.loginFailed': 'Login mislykkedes.',
  'user.notification.newLogin': 'Nyt login',
  'user.notification.newLoginBody': 'Nyt login fra {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Brugernavn må ikke være tomt.',
  'user.error.usernameInvalid':
    'Brugernavnet må kun indeholde bogstaver, tal, punktummer, bindestreger og understregninger.',
  'user.error.bodyNestedUnderUser':
    'Denne forespørgsel indlejrer sine felter under "user"; send brugernavn, e-mail og adgangskode på øverste niveau.',
  'user.error.failedToUpdateUser': 'Kunne ikke opdatere bruger.',
  'user.error.failedToDeleteUser': 'Kunne ikke slette bruger.',
  'user.error.failedToReadUser': 'Kunne ikke læse bruger.',
  'user.error.emailRequired': 'E-mail er påkrævet.',
  'user.email.passwordResetSubject': '{{appName}} - Nulstilling af adgangskode',
  'user.email.passwordResetText': 'Dit token til nulstilling af adgangskode er: {{token}}',
  'user.email.passwordResetLink': 'Nulstil din adgangskode på: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Dit token til nulstilling af adgangskode er: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Nulstil din adgangskode</a></p>',
  'user.error.failedToProcessPasswordReset': 'Kunne ikke behandle nulstilling af adgangskode.',
  'user.error.newPasswordRequired': 'Ny adgangskode er påkrævet.',
  'user.error.currentPasswordRequired': 'Nuværende adgangskode er påkrævet.',
  'user.error.currentPasswordIncorrect': 'Nuværende adgangskode er forkert.',
  'user.error.failedToUpdatePassword': 'Kunne ikke opdatere adgangskode.',
  'user.error.planKeyRequired': 'planKey er påkrævet.',
  'user.error.invalidPlan': 'Ugyldig plan.',
  'user.error.failedToUpdateSubscription': 'Kunne ikke opdatere abonnement.',
  'user.error.failedToUpdatePlan': 'Kunne ikke opdatere plan.',
  'user.error.twoFactorNotAvailable': 'To-faktor-godkendelse er ikke tilgængelig.',
  'user.error.twoFactorRequiresPassword':
    'To-faktor-godkendelse er aktiveret på denne konto. Log ind med din e-mail og adgangskode for at fortsætte.',
  'user.error.tokenRequired': 'Token er påkrævet.',
  'user.error.noPendingTwoFactorSetup':
    'Ingen ventende to-faktor-opsætning. Kald med handlingen "setup" først.',
  'user.error.invalidToken': 'Ugyldigt token.',
  'user.error.twoFactorRequired': 'En to-faktor-kode er påkrævet.',
  'user.error.twoFactorNotEnabled': 'To-faktor er ikke aktiveret.',
  'user.error.invalidAction': 'Ugyldig handling. Brug "setup", "enable" eller "disable".',
  'user.error.twoFactorOperationFailed': 'To-faktor-operation mislykkedes.',
  'user.error.oauthServerNotConfigured': 'OAuth-server "{{server}}" er ikke konfigureret.',
  'user.error.oauthVerificationFailed': 'OAuth-verifikation mislykkedes.',
  'user.error.failedToCreateUser': 'Kunne ikke oprette bruger.',
  'user.error.oauthLoginFailed': 'OAuth-login mislykkedes.',
  'user.error.unauthorized': 'Uberettiget',
  'user.error.passwordTooLong': 'Adgangskoden må højst indeholde {{max}} tegn',
  'user.error.passwordTooShort': 'Adgangskoden skal være mindst {{min}} tegn lang',
  'user.error.tooManyRequests': 'For mange forsøg. Vent venligst og prøv igen.',
  'user.error.webhookUnauthorized': 'Meddelelse om uautoriseret betaling',
  'user.error.credentialsNested':
    'Dette login-slutpunkt læser legitimationsoplysninger på øverste niveau, men denne krop indlejrer dem under {{envelope}}. Sæt loginEndpoint til den rute, der udpakker denne konvolut, eller brug createRequestHandler med mapRequest til at udpakke req.body[ {{envelope}}] før handlers.logIn.',
  'user.error.oauthStateMismatch': 'OAuth-tilstandsmismatch — muligt CSRF-angreb',
  'user.error.avatarTooLarge': 'Avataren skal være på højst {{max}} tegn.',
  'user.error.bioTooLong': 'Biografien skal være på højst {{max}} tegn.',
  'user.error.noUpdatableFields': 'Der blev ikke angivet nogen felter, der kunne opdateres.',
  'user.error.oauthDataInvalid': 'oauthData skal være et objekt.',
  'user.error.subscriptionActivationRequiresVerification':
    'Aktivering af abonnement skal gennemgå en kvitteringsverifikation — brug POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount': 'Ingen {{provider}}-faktureringskonto fundet for denne bruger.',
  'user.payment.portalFailed': 'Faktureringsportalen for {{provider}} kunne ikke åbnes.',
  'user.payment.portalNotSupported': '{{provider}} tilbyder ikke en faktureringsportal.',
  'user.payment.subscriptionOwnershipMismatch': 'Dette abonnement tilhører ikke din konto.',
  'user.payment.transactionAlreadyClaimed': 'Dette køb er allerede knyttet til en anden konto.',
  'user.error.completeTargetMissing': 'Der findes ingen konto med det angivne id som completeId.',
  'user.error.completeIdentityMismatch':
    'Det angivne brugernavn eller den angivne e-mail identificerer ikke completeId-kontoen.',
  'user.error.completeNotOwned':
    'completeId-kontoen logger ind via OAuth; dens legitimationsoplysninger er ikke angivet her.',
  'user.error.identityRequired':
    'Provisionering kræver et brugernavn eller en e-mailadresse for at identificere kontoen.',
  'user.error.usernameEmailConflict':
    'Brugernavnet og e-mailadressen tilhører to forskellige eksisterende konti.',
  'user.error.oauthEmailCollision':
    'Der findes allerede en konto til denne e-mail. Log venligst ind med din oprindelige metode, og link derefter denne udbyder fra dine kontoindstillinger.',
}
