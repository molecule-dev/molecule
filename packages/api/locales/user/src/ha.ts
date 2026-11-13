import type { UserTranslations } from './types.js'

/** User translations for Hausa. */
export const ha: UserTranslations = {
  'user.error.badRequest': 'Buƙatar da ba ta dace ba.',
  'user.error.notFound': 'Ba a samu ba.',
  'user.error.failedToCreateSession': 'An kasa ƙirƙirar zama.',
  'user.error.usernameRequired': 'Ana buƙatar sunan mai amfani.',
  'user.error.passwordRequired': 'Ana buƙatar kalmar sirri.',
  'user.error.emailInvalid': 'Imel ba shi da inganci.',
  'user.error.usernameUnavailable': 'Sunan mai amfani ba ya samuwa.',
  'user.error.emailAlreadyRegistered': 'An riga an yi rajista da imel.',
  'user.error.failedToHashPassword': 'An kasa yin hash ɗin kalmar sirri.',
  'user.error.invalidCredentials': 'Bayanan shiga marasa inganci.',
  'user.error.invalidTwoFactorToken': 'Token mai mataki biyu mara inganci.',
  'user.error.twoFactorVerificationUnavailable': 'Tabbatarwa mai mataki biyu ba ta samuwa.',
  'user.error.loginFailed': 'Shigar da ya gaza.',
  'user.notification.newLogin': 'Sabuwar shiga',
  'user.notification.newLoginBody': 'Sabuwar shiga daga {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Sunan mai amfani ba zai iya zama fanko ba.',
  'user.error.usernameInvalid':
    'Sunan mai amfani zai iya ƙunsar haruffa, lambobi, ɗigo, layi da layin ƙasa kawai.',
  'user.error.bodyNestedUnderUser':
    'Wannan buƙatar tana saka filayenta ƙarƙashin "user"; aika sunan mai amfani, imel da kalmar sirri a babban mataki.',
  'user.error.failedToUpdateUser': 'An kasa sabunta mai amfani.',
  'user.error.failedToDeleteUser': 'An kasa share mai amfani.',
  'user.error.failedToReadUser': 'An kasa karanta mai amfani.',
  'user.error.emailRequired': 'Ana buƙatar imel.',
  'user.email.passwordResetSubject': '{{appName}} - Sake saita kalmar sirri',
  'user.email.passwordResetText': 'Token ɗin sake saita kalmar sirri ku shine: {{token}}',
  'user.email.passwordResetLink': 'Sake saita kalmar sirri a: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Token ɗin sake saita kalmar sirri ku shine: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Sake saita kalmar sirri</a></p>',
  'user.error.failedToProcessPasswordReset': 'An kasa sarrafa sake saita kalmar sirri.',
  'user.error.newPasswordRequired': 'Ana buƙatar sabuwar kalmar sirri.',
  'user.error.currentPasswordRequired': 'Ana buƙatar kalmar sirri na yanzu.',
  'user.error.currentPasswordIncorrect': 'Kalmar sirri na yanzu ba ta dace ba.',
  'user.error.failedToUpdatePassword': 'An kasa sabunta kalmar sirri.',
  'user.error.planKeyRequired': 'Ana buƙatar planKey.',
  'user.error.invalidPlan': 'Shiri mara inganci.',
  'user.error.failedToUpdateSubscription': 'An kasa sabunta biyan kuɗi.',
  'user.error.failedToUpdatePlan': 'An kasa sabunta shiri.',
  'user.error.twoFactorNotAvailable': 'Tantancewa mai mataki biyu ba ta samuwa.',
  'user.error.twoFactorRequiresPassword':
    'An kunna tantancewa mai mataki biyu a wannan asusun. Shiga da imel da kalmar sirrinka don ci gaba.',
  'user.error.tokenRequired': 'Ana buƙatar token.',
  'user.error.noPendingTwoFactorSetup':
    'Babu saitin mataki biyu da ke jira. Fara kira da aikin "setup".',
  'user.error.invalidToken': 'Token mara inganci.',
  'user.error.twoFactorRequired': 'Ana buƙatar lambar mataki biyu.',
  'user.error.twoFactorNotEnabled': 'Ba a kunna mataki biyu ba.',
  'user.error.invalidAction':
    'Aikin da ba shi da inganci. Yi amfani da "setup", "enable", ko "disable".',
  'user.error.twoFactorOperationFailed': 'Aikin mataki biyu ya gaza.',
  'user.error.oauthServerNotConfigured': 'Ba a saita uwar garken OAuth "{{server}}" ba.',
  'user.error.oauthVerificationFailed': 'Tabbatarwar OAuth ta gaza.',
  'user.error.failedToCreateUser': 'An kasa ƙirƙirar mai amfani.',
  'user.error.oauthLoginFailed': 'Shigar OAuth ya gaza.',
  'user.error.unauthorized': 'Ba a ba da izini ba',
  'user.error.passwordTooLong': 'Dole ne kalmar sirri ta kasance aƙalla haruffa {{max}}',
  'user.error.passwordTooShort': 'Dole ne kalmar sirri ta kasance aƙalla haruffa {{min}}',
  'user.error.tooManyRequests':
    'Gwaje-gwaje da yawa sun yi yawa. Da fatan za a jira kuma a sake gwadawa.',
  'user.error.webhookUnauthorized': 'Sanarwar biyan kuɗi ba tare da izini ba',
  'user.error.credentialsNested':
    'Wannan ƙarshen shiga yana karanta takardun shaidar shiga a matakin sama, amma wannan jikin yana sanya su a ƙarƙashin {{envelope}}. Saita loginEndpoint zuwa hanyar da ta buɗe wannan ambulan, ko amfani da createRequestHandler tare da mapRequest don buɗe req.body[ {{envelope}}] kafin handlers.logIn.',
  'user.error.oauthStateMismatch': 'Rashin daidaiton yanayin OAuth — yiwuwar harin CSRF',
  'user.error.avatarTooLarge': 'Dole ne Avatar ya zama haruffa {{max}} ko ƙasa da haka.',
  'user.error.bioTooLong': 'Dole ne tarihin rayuwa ya zama haruffa {{max}} ko ƙasa da haka.',
  'user.error.noUpdatableFields': 'Ba a bayar da filayen da za a iya sabunta su ba.',
  'user.error.oauthDataInvalid': 'OauthData dole ne ya zama abu.',
  'user.error.subscriptionActivationRequiresVerification':
    'Dole ne a tabbatar da cewa an kunna biyan kuɗi ta hanyar amfani da POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount':
    'Babu asusun biyan kuɗi na {{provider}} da aka samu ga wannan mai amfani.',
  'user.payment.portalFailed': 'An kasa buɗe shafin biyan kuɗi na {{provider}} .',
  'user.payment.portalNotSupported': '{{provider}} ba ya bayar da hanyar biyan kuɗi.',
  'user.payment.subscriptionOwnershipMismatch': 'Wannan biyan kuɗin ba na asusunka bane.',
  'user.payment.transactionAlreadyClaimed': 'An riga an haɗa wannan siyan da wani asusu.',
  'user.error.completeTargetMissing':
    'Babu wani asusu da ke da id ɗin da aka bayar a matsayin completeId.',
  'user.error.completeIdentityMismatch':
    'Sunan mai amfani ko imel ɗin da aka bayar bai gano cikakken asusun ID ba.',
  'user.error.completeNotOwned':
    'Asusun cikakken Id yana shiga ta hanyar OAuth; ba a bayar da takardun shaidarsa a nan ba.',
  'user.error.identityRequired':
    'Samar da kayayyaki yana buƙatar sunan mai amfani ko imel don gano asusun.',
  'user.error.usernameEmailConflict':
    'Sunan mai amfani da imel ɗin suna cikin asusun guda biyu daban-daban da ke akwai.',
  'user.error.oauthEmailCollision':
    'Akwai asusu na wannan imel ɗin. Da fatan za a shiga da hanyarka ta asali, sannan a haɗa wannan mai bada sabis ɗin daga saitunan asusunka.',
}
