import type { UserTranslations } from './types.js'

/** User translations for Slovenian. */
export const sl: UserTranslations = {
  'user.error.badRequest': 'Napačna zahteva.',
  'user.error.notFound': 'Ni najdeno.',
  'user.error.failedToCreateSession': 'Ustvarjanje seje ni uspelo.',
  'user.error.usernameRequired': 'Uporabniško ime je obvezno.',
  'user.error.passwordRequired': 'Geslo je obvezno.',
  'user.error.emailInvalid': 'E-pošta je neveljavna.',
  'user.error.usernameUnavailable': 'Uporabniško ime ni na voljo.',
  'user.error.emailAlreadyRegistered': 'E-pošta je že registrirana.',
  'user.error.failedToHashPassword': 'Zgoščevanje gesla ni uspelo.',
  'user.error.invalidCredentials': 'Neveljavne poverilnice.',
  'user.error.invalidTwoFactorToken': 'Neveljaven dvofaktorski žeton.',
  'user.error.twoFactorVerificationUnavailable': 'Dvofaktorsko preverjanje ni na voljo.',
  'user.error.loginFailed': 'Prijava ni uspela.',
  'user.notification.newLogin': 'Nova prijava',
  'user.notification.newLoginBody': 'Nova prijava iz {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Uporabniško ime ne more biti prazno.',
  'user.error.usernameInvalid':
    'Uporabniško ime lahko vsebuje le črke, številke, pike, vezaje in podčrtaje.',
  'user.error.bodyNestedUnderUser':
    'To telo gnezdi svoja polja pod "user"; pošljite uporabniško ime, e-pošto in geslo na najvišji ravni.',
  'user.error.failedToUpdateUser': 'Posodobitev uporabnika ni uspela.',
  'user.error.failedToDeleteUser': 'Izbris uporabnika ni uspel.',
  'user.error.failedToReadUser': 'Branje uporabnika ni uspelo.',
  'user.error.emailRequired': 'E-pošta je obvezna.',
  'user.email.passwordResetSubject': '{{appName}} - Ponastavitev gesla',
  'user.email.passwordResetText': 'Vaš žeton za ponastavitev gesla je: {{token}}',
  'user.email.passwordResetLink': 'Ponastavite geslo na: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Vaš žeton za ponastavitev gesla je: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Ponastavite geslo</a></p>',
  'user.error.failedToProcessPasswordReset': 'Obdelava ponastavitve gesla ni uspela.',
  'user.error.newPasswordRequired': 'Novo geslo je obvezno.',
  'user.error.currentPasswordRequired': 'Trenutno geslo je obvezno.',
  'user.error.currentPasswordIncorrect': 'Trenutno geslo je napačno.',
  'user.error.failedToUpdatePassword': 'Posodobitev gesla ni uspela.',
  'user.error.planKeyRequired': 'planKey je obvezen.',
  'user.error.invalidPlan': 'Neveljaven paket.',
  'user.error.failedToUpdateSubscription': 'Posodobitev naročnine ni uspela.',
  'user.error.failedToUpdatePlan': 'Posodobitev paketa ni uspela.',
  'user.error.twoFactorNotAvailable': 'Dvofaktorsko preverjanje ni na voljo.',
  'user.error.twoFactorRequiresPassword':
    'Dvofaktorsko preverjanje je omogočeno za ta račun. Za nadaljevanje se prijavite z e-pošto in geslom.',
  'user.error.tokenRequired': 'Žeton je obvezen.',
  'user.error.noPendingTwoFactorSetup':
    'Ni čakajočega dvofaktorskega nastavitve. Najprej pokličite z dejanjem "setup".',
  'user.error.invalidToken': 'Neveljaven žeton.',
  'user.error.twoFactorRequired': 'Zahtevana je dvofaktorska koda.',
  'user.error.twoFactorNotEnabled': 'Dvofaktorsko preverjanje ni omogočeno.',
  'user.error.invalidAction': 'Neveljavno dejanje. Uporabite "setup", "enable" ali "disable".',
  'user.error.twoFactorOperationFailed': 'Dvofaktorska operacija ni uspela.',
  'user.error.oauthServerNotConfigured': 'OAuth strežnik "{{server}}" ni konfiguriran.',
  'user.error.oauthVerificationFailed': 'OAuth preverjanje ni uspelo.',
  'user.error.failedToCreateUser': 'Ustvarjanje uporabnika ni uspelo.',
  'user.error.oauthLoginFailed': 'OAuth prijava ni uspela.',
  'user.error.unauthorized': 'Nepooblaščeno',
  'user.error.passwordTooLong': 'Geslo mora imeti največ {{max}} znakov',
  'user.error.passwordTooShort': 'Geslo mora imeti vsaj {{min}} znakov',
  'user.error.tooManyRequests': 'Preveč poskusov. Počakajte in poskusite znova.',
  'user.error.webhookUnauthorized': 'Obvestilo o nepooblaščenem plačilu',
  'user.error.credentialsNested':
    'Ta končna točka za prijavo bere poverilnice na najvišji ravni, vendar jih to telo ugnezdi pod {{envelope}}. Nastavite loginEndpoint na pot, ki odvije to ovojnico, ali pa uporabite createRequestHandler z mapRequest za odvijanje req.body[ {{envelope}}] pred handlers.logIn.',
  'user.error.oauthStateMismatch': 'Neujemanje stanja OAuth – možen napad CSRF',
  'user.error.avatarTooLarge': 'Avatar mora imeti {{max}} znakov ali manj.',
  'user.error.bioTooLong': 'Življenjepis mora imeti največ {{max}} znakov.',
  'user.error.noUpdatableFields':
    'Ni bilo na voljo nobenih polj, ki bi jih bilo mogoče posodobiti.',
  'user.error.oauthDataInvalid': 'oauthData mora biti objekt.',
  'user.error.subscriptionActivationRequiresVerification':
    'Aktivacija naročnine mora potekati s preverjanjem potrdila – uporabite POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount':
    'Za tega uporabnika ni bil najden račun za obračunavanje {{provider}} .',
  'user.payment.portalFailed':
    'Portala za obračunavanje ponudnika {{provider}} ni bilo mogoče odpreti.',
  'user.payment.portalNotSupported': '{{provider}} ne ponuja portala za obračunavanje.',
  'user.payment.subscriptionOwnershipMismatch': 'Ta naročnina ne pripada vašemu računu.',
  'user.payment.transactionAlreadyClaimed': 'Ta nakup je že povezan z drugim računom.',
  'user.error.completeTargetMissing': 'Z ID-jem, navedenim kot completeId, ne obstaja noben račun.',
  'user.error.completeIdentityMismatch':
    'Navedeno uporabniško ime ali e-poštni naslov ne identificira računa completeId.',
  'user.error.completeNotOwned':
    'Račun completeId se prijavi prek OAuth; njegove poverilnice tukaj niso omogočene.',
  'user.error.identityRequired':
    'Za omogočanje uporabe je potrebno uporabniško ime ali e-poštni naslov za identifikacijo računa.',
  'user.error.usernameEmailConflict':
    'Uporabniško ime in e-poštni naslov pripadata dvema različnima obstoječima računoma.',
  'user.error.oauthEmailCollision':
    'Za ta e-poštni naslov že obstaja račun. Prijavite se s prvotno metodo in nato v nastavitvah računa povežite tega ponudnika.',
}
