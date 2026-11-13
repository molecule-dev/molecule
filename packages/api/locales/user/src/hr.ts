import type { UserTranslations } from './types.js'

/** User translations for Croatian. */
export const hr: UserTranslations = {
  'user.error.badRequest': 'Nevažeći zahtjev.',
  'user.error.notFound': 'Nije pronađeno.',
  'user.error.failedToCreateSession': 'Stvaranje sesije nije uspjelo.',
  'user.error.usernameRequired': 'Korisničko ime je obavezno.',
  'user.error.passwordRequired': 'Lozinka je obavezna.',
  'user.error.emailInvalid': 'E-pošta je nevažeća.',
  'user.error.usernameUnavailable': 'Korisničko ime nije dostupno.',
  'user.error.emailAlreadyRegistered': 'E-pošta je već registrirana.',
  'user.error.failedToHashPassword': 'Heširanje lozinke nije uspjelo.',
  'user.error.invalidCredentials': 'Nevažeće vjerodajnice.',
  'user.error.invalidTwoFactorToken': 'Nevažeći dvofaktorski token.',
  'user.error.twoFactorVerificationUnavailable': 'Dvofaktorska verifikacija nedostupna.',
  'user.error.loginFailed': 'Prijava nije uspjela.',
  'user.notification.newLogin': 'Nova prijava',
  'user.notification.newLoginBody': 'Nova prijava s {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Korisničko ime ne može biti prazno.',
  'user.error.usernameInvalid':
    'Korisničko ime smije sadržavati samo slova, brojeve, točke, crtice i podvlake.',
  'user.error.bodyNestedUnderUser':
    'Ovaj zahtjev ugnježđuje svoja polja pod "user"; pošaljite korisničko ime, e-poštu i lozinku na najvišoj razini.',
  'user.error.failedToUpdateUser': 'Ažuriranje korisnika nije uspjelo.',
  'user.error.failedToDeleteUser': 'Brisanje korisnika nije uspjelo.',
  'user.error.failedToReadUser': 'Čitanje korisnika nije uspjelo.',
  'user.error.emailRequired': 'E-pošta je obavezna.',
  'user.email.passwordResetSubject': '{{appName}} - Ponovno postavljanje lozinke',
  'user.email.passwordResetText': 'Vaš token za ponovno postavljanje lozinke je: {{token}}',
  'user.email.passwordResetLink': 'Ponovno postavite lozinku na: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Vaš token za ponovno postavljanje lozinke je: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Ponovno postavite lozinku</a></p>',
  'user.error.failedToProcessPasswordReset': 'Obrada ponovnog postavljanja lozinke nije uspjela.',
  'user.error.newPasswordRequired': 'Nova lozinka je obavezna.',
  'user.error.currentPasswordRequired': 'Trenutna lozinka je obavezna.',
  'user.error.currentPasswordIncorrect': 'Trenutna lozinka je netočna.',
  'user.error.failedToUpdatePassword': 'Ažuriranje lozinke nije uspjelo.',
  'user.error.planKeyRequired': 'planKey je obavezan.',
  'user.error.invalidPlan': 'Nevažeći plan.',
  'user.error.failedToUpdateSubscription': 'Ažuriranje pretplate nije uspjelo.',
  'user.error.failedToUpdatePlan': 'Ažuriranje plana nije uspjelo.',
  'user.error.twoFactorNotAvailable': 'Dvofaktorska autentifikacija nije dostupna.',
  'user.error.twoFactorRequiresPassword':
    'Dvofaktorska autentifikacija je omogućena na ovom računu. Prijavite se e-poštom i lozinkom za nastavak.',
  'user.error.tokenRequired': 'Token je obavezan.',
  'user.error.noPendingTwoFactorSetup':
    'Nema dvofaktorskog postavljanja na čekanju. Pozovite s radnjom "setup" prvo.',
  'user.error.invalidToken': 'Nevažeći token.',
  'user.error.twoFactorRequired': 'Potreban je dvofaktorski kod.',
  'user.error.twoFactorNotEnabled': 'Dvofaktorska autentifikacija nije omogućena.',
  'user.error.invalidAction': 'Nevažeća radnja. Koristite "setup", "enable" ili "disable".',
  'user.error.twoFactorOperationFailed': 'Dvofaktorska operacija nije uspjela.',
  'user.error.oauthServerNotConfigured': 'OAuth poslužitelj "{{server}}" nije konfiguriran.',
  'user.error.oauthVerificationFailed': 'OAuth verifikacija nije uspjela.',
  'user.error.failedToCreateUser': 'Stvaranje korisnika nije uspjelo.',
  'user.error.oauthLoginFailed': 'OAuth prijava nije uspjela.',
  'user.error.unauthorized': 'Neovlašteno',
  'user.error.passwordTooLong': 'Lozinka mora imati najviše {{max}} znakova',
  'user.error.passwordTooShort': 'Lozinka mora imati najmanje {{min}} znakova',
  'user.error.tooManyRequests': 'Previše pokušaja. Pričekajte i pokušajte ponovno.',
  'user.error.webhookUnauthorized': 'Obavijest o neovlaštenom plaćanju',
  'user.error.credentialsNested':
    'Ova krajnja točka za prijavu čita vjerodajnice na najvišoj razini, ali ovo tijelo ih ugnijezduje pod {{envelope}}. Postavite loginEndpoint na rutu koja odmotava ovu omotač ili upotrijebite createRequestHandler s mapRequest za odmotavanje req.body[ {{envelope}}] prije handlers.logIn.',
  'user.error.oauthStateMismatch': 'Neusklađenost stanja OAuth-a — mogući CSRF napad',
  'user.error.avatarTooLarge': 'Avatar mora imati {{max}} znakova ili manje.',
  'user.error.bioTooLong': 'Biografija mora imati {{max}} znakova ili manje.',
  'user.error.noUpdatableFields': 'Nisu navedena polja koja se mogu ažurirati.',
  'user.error.oauthDataInvalid': 'oauthData mora biti objekt.',
  'user.error.subscriptionActivationRequiresVerification':
    'Aktivacija pretplate mora proći kroz provjeru računa — koristite POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount': 'Nije pronađen {{provider}} račun za naplatu za ovog korisnika.',
  'user.payment.portalFailed': 'Nije moguće otvoriti portal za naplatu {{provider}} .',
  'user.payment.portalNotSupported': '{{provider}} ne nudi portal za naplatu.',
  'user.payment.subscriptionOwnershipMismatch': 'Ova pretplata ne pripada vašem računu.',
  'user.payment.transactionAlreadyClaimed': 'Ova kupnja je već povezana s drugim računom.',
  'user.error.completeTargetMissing': 'Ne postoji račun s ID-om navedenim kao completeId.',
  'user.error.completeIdentityMismatch':
    'Navedeno korisničko ime ili e-pošta ne identificiraju completeId račun.',
  'user.error.completeNotOwned':
    'Račun completeId prijavljuje se putem OAuth-a; njegovi vjerodajnici nisu ovdje dodijeljeni.',
  'user.error.identityRequired':
    'Za dodjelu je potrebno korisničko ime ili e-pošta za identifikaciju računa.',
  'user.error.usernameEmailConflict':
    'Korisničko ime i e-pošta pripadaju dvama različitim postojećim računima.',
  'user.error.oauthEmailCollision':
    'Već postoji račun za ovu e-adresu. Prijavite se izvornom metodom, a zatim povežite ovog pružatelja usluga iz postavki računa.',
}
