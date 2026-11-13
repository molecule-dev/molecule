import type { UserTranslations } from './types.js'

/** User translations for Zulu. */
export const zu: UserTranslations = {
  'user.error.badRequest': 'Isicelo esingalungile.',
  'user.error.notFound': 'Ayitholakali.',
  'user.error.failedToCreateSession': 'Yehlulekile ukwakha iseshini.',
  'user.error.usernameRequired': 'Igama lomsebenzisi liyadingeka.',
  'user.error.passwordRequired': 'Iphasiwedi iyadingeka.',
  'user.error.emailInvalid': 'I-imeyili ayilungile.',
  'user.error.usernameUnavailable': 'Igama lomsebenzisi alitholakali.',
  'user.error.emailAlreadyRegistered': 'I-imeyili isivele ibhaliswe.',
  'user.error.failedToHashPassword': 'Yehlulekile ukusimba iphasiwedi.',
  'user.error.invalidCredentials': 'Iziqinisekiso ezingavumelekile.',
  'user.error.invalidTwoFactorToken': 'Ithokheni yezinyathelo ezimbili engavumelekile.',
  'user.error.twoFactorVerificationUnavailable':
    'Ukuqinisekiswa kwezinyathelo ezimbili akutholakali.',
  'user.error.loginFailed': 'Ukungena kuhlulekile.',
  'user.notification.newLogin': 'Ukungena Okusha',
  'user.notification.newLoginBody': 'Ukungena okusha kusuka ku-{{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Igama lomsebenzisi alikwazi ukuba ngeze.',
  'user.error.usernameInvalid':
    'Igama lomsebenzisi lingaqukatha kuphela izinhlamvu, izinombolo, amachashazi, ama-hyphen nama-underscore.',
  'user.error.bodyNestedUnderUser':
    'Lesi sicelo sibeka izinkambu zaso ngaphansi kwe-"user"; thumela igama lomsebenzisi, i-imeyili nephasiwedi ezingeni eliphezulu.',
  'user.error.failedToUpdateUser': 'Yehlulekile ukubuyekeza umsebenzisi.',
  'user.error.failedToDeleteUser': 'Yehlulekile ukususa umsebenzisi.',
  'user.error.failedToReadUser': 'Yehlulekile ukufunda umsebenzisi.',
  'user.error.emailRequired': 'I-imeyili iyadingeka.',
  'user.email.passwordResetSubject': '{{appName}} - Ukusetha Kabusha Iphasiwedi',
  'user.email.passwordResetText': 'Ithokheni yakho yokusetha kabusha iphasiwedi: {{token}}',
  'user.email.passwordResetLink': 'Setha kabusha iphasiwedi yakho ku: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Ithokheni yakho yokusetha kabusha iphasiwedi: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Setha kabusha iphasiwedi yakho</a></p>',
  'user.error.failedToProcessPasswordReset':
    'Yehlulekile ukucubungula ukusetha kabusha iphasiwedi.',
  'user.error.newPasswordRequired': 'Iphasiwedi entsha iyadingeka.',
  'user.error.currentPasswordRequired': 'Iphasiwedi yamanje iyadingeka.',
  'user.error.currentPasswordIncorrect': 'Iphasiwedi yamanje ayilungile.',
  'user.error.failedToUpdatePassword': 'Yehlulekile ukubuyekeza iphasiwedi.',
  'user.error.planKeyRequired': 'i-planKey iyadingeka.',
  'user.error.invalidPlan': 'Uhlelo olungavumelekile.',
  'user.error.failedToUpdateSubscription': 'Yehlulekile ukubuyekeza isithangami.',
  'user.error.failedToUpdatePlan': 'Yehlulekile ukubuyekeza uhlelo.',
  'user.error.twoFactorNotAvailable': 'Ukuqinisekiswa kwezinyathelo ezimbili akutholakali.',
  'user.error.twoFactorRequiresPassword':
    'Ukuqinisekiswa kwezinyathelo ezimbili kuvuliwe kule akhawunti. Ngena ngemeyili nephasiwedi yakho ukuze uqhubeke.',
  'user.error.tokenRequired': 'Ithokheni iyadingeka.',
  'user.error.noPendingTwoFactorSetup':
    'Akukho ukumiswa kwezinyathelo ezimbili okulindile. Shayela ngesenzo se-"setup" kuqala.',
  'user.error.invalidToken': 'Ithokheni engavumelekile.',
  'user.error.twoFactorRequired': 'Ikhodi yezinyathelo ezimbili iyadingeka.',
  'user.error.twoFactorNotEnabled': 'Izinyathelo ezimbili azivulwanga.',
  'user.error.invalidAction':
    'Isenzo esingavumelekile. Sebenzisa "setup", "enable", noma "disable".',
  'user.error.twoFactorOperationFailed': 'Umsebenzi wezinyathelo ezimbili uhlulekile.',
  'user.error.oauthServerNotConfigured': 'Iseva ye-OAuth "{{server}}" ayimisekanga.',
  'user.error.oauthVerificationFailed': 'Ukuqinisekiswa kwe-OAuth kuhlulekile.',
  'user.error.failedToCreateUser': 'Yehlulekile ukwakha umsebenzisi.',
  'user.error.oauthLoginFailed': 'Ukungena nge-OAuth kuhlulekile.',
  'user.error.unauthorized': 'Akugunyaziwe',
  'user.error.passwordTooLong': 'Iphasiwedi kumele ibe nezinhlamvu ezingu {{max}} okungenani',
  'user.error.passwordTooShort': 'Iphasiwedi kumele okungenani ibe nezinhlamvu ezingu {{min}}',
  'user.error.tooManyRequests': 'Imizamo eminingi kakhulu. Sicela ulinde bese uzama futhi.',
  'user.error.webhookUnauthorized': 'Isaziso sokukhokha esingagunyaziwe',
  'user.error.credentialsNested':
    'Le ndawo yokungena ngemvume ifunda iziqinisekiso ezingeni eliphezulu, kodwa lo mzimba uzigcina ngaphansi kwe {{envelope}}. Setha i-loginEndpoint endleleni evula le mvilophu, noma sebenzisa i-createRequestHandler ene-mapRequest ukuze u-unwrap req.body[ {{envelope}}] ngaphambi kwe-handlers.logIn.',
  'user.error.oauthStateMismatch': 'Ukungafani kwesimo se-OAuth — ukuhlaselwa kwe-CSRF okungenzeka',
  'user.error.avatarTooLarge': 'I-Avatar kumele ibe yizinhlamvu ezingu {{max}} noma ngaphansi.',
  'user.error.bioTooLong': 'I-bio kumele ibe yizinhlamvu ezingu {{max}} noma ngaphansi.',
  'user.error.noUpdatableFields': 'Azikho izinkambu ezingabuyekezwa ezinikeziwe.',
  'user.error.oauthDataInvalid': 'I-oauthData kumele ibe yinto.',
  'user.error.subscriptionActivationRequiresVerification':
    'Ukwenza kusebenze ukubhalisa kumele kudlule ekuqinisekisweni kwerisidi — sebenzisa i-POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount':
    'Ayikho i-akhawunti yokukhokha ye {{provider}} etholakele kulo msebenzisi.',
  'user.payment.portalFailed': 'Ayikwazanga ukuvula iphothali yokukhokha ye {{provider}} .',
  'user.payment.portalNotSupported': '{{provider}} ayinikezi iphothali yokukhokha.',
  'user.payment.subscriptionOwnershipMismatch': 'Lokhu okubhaliselwe akuyona eye-akhawunti yakho.',
  'user.payment.transactionAlreadyClaimed':
    'Lokhu kuthenga sekuvele kuhlotshaniswa nenye i-akhawunti.',
}
