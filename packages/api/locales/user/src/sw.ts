import type { UserTranslations } from './types.js'

/** User translations for Swahili. */
export const sw: UserTranslations = {
  'user.error.badRequest': 'Ombi batili.',
  'user.error.notFound': 'Haijapatikana.',
  'user.error.failedToCreateSession': 'Imeshindwa kuunda kipindi.',
  'user.error.usernameRequired': 'Jina la mtumiaji linahitajika.',
  'user.error.passwordRequired': 'Nenosiri linahitajika.',
  'user.error.emailInvalid': 'Barua pepe ni batili.',
  'user.error.usernameUnavailable': 'Jina la mtumiaji halipatikani.',
  'user.error.emailAlreadyRegistered': 'Barua pepe tayari imesajiliwa.',
  'user.error.failedToHashPassword': 'Imeshindwa kusimba nenosiri.',
  'user.error.invalidCredentials': 'Vitambulisho batili.',
  'user.error.invalidTwoFactorToken': 'Tokeni ya hatua mbili batili.',
  'user.error.twoFactorVerificationUnavailable': 'Uthibitishaji wa hatua mbili haupatikani.',
  'user.error.loginFailed': 'Kuingia kumeshindwa.',
  'user.notification.newLogin': 'Kuingia Mpya',
  'user.notification.newLoginBody': 'Kuingia mpya kutoka {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Jina la mtumiaji haliwezi kuwa tupu.',
  'user.error.usernameInvalid':
    'Jina la mtumiaji linaweza kuwa na herufi, nambari, nukta, vistari na mistari ya chini pekee.',
  'user.error.bodyNestedUnderUser':
    'Ombi hili linaweka sehemu zake chini ya "user"; tuma jina la mtumiaji, barua pepe na nenosiri katika kiwango cha juu.',
  'user.error.failedToUpdateUser': 'Imeshindwa kusasisha mtumiaji.',
  'user.error.failedToDeleteUser': 'Imeshindwa kufuta mtumiaji.',
  'user.error.failedToReadUser': 'Imeshindwa kusoma mtumiaji.',
  'user.error.emailRequired': 'Barua pepe inahitajika.',
  'user.email.passwordResetSubject': '{{appName}} - Kuweka Upya Nenosiri',
  'user.email.passwordResetText': 'Tokeni yako ya kuweka upya nenosiri ni: {{token}}',
  'user.email.passwordResetLink': 'Weka upya nenosiri lako kwenye: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Tokeni yako ya kuweka upya nenosiri ni: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Weka upya nenosiri lako</a></p>',
  'user.error.failedToProcessPasswordReset': 'Imeshindwa kusindika kuweka upya nenosiri.',
  'user.error.newPasswordRequired': 'Nenosiri jipya linahitajika.',
  'user.error.currentPasswordRequired': 'Nenosiri la sasa linahitajika.',
  'user.error.currentPasswordIncorrect': 'Nenosiri la sasa si sahihi.',
  'user.error.failedToUpdatePassword': 'Imeshindwa kusasisha nenosiri.',
  'user.error.planKeyRequired': 'planKey inahitajika.',
  'user.error.invalidPlan': 'Mpango batili.',
  'user.error.failedToUpdateSubscription': 'Imeshindwa kusasisha usajili.',
  'user.error.failedToUpdatePlan': 'Imeshindwa kusasisha mpango.',
  'user.error.twoFactorNotAvailable': 'Uthibitishaji wa hatua mbili haupatikani.',
  'user.error.twoFactorRequiresPassword':
    'Uthibitishaji wa hatua mbili umewashwa kwenye akaunti hii. Ingia kwa barua pepe na nenosiri lako ili kuendelea.',
  'user.error.tokenRequired': 'Tokeni inahitajika.',
  'user.error.noPendingTwoFactorSetup':
    'Hakuna usanidi wa hatua mbili unaongojea. Piga simu kwa kitendo cha "setup" kwanza.',
  'user.error.invalidToken': 'Tokeni batili.',
  'user.error.twoFactorRequired': 'Msimbo wa hatua mbili unahitajika.',
  'user.error.twoFactorNotEnabled': 'Hatua mbili haijawezeshwa.',
  'user.error.invalidAction': 'Kitendo batili. Tumia "setup", "enable", au "disable".',
  'user.error.twoFactorOperationFailed': 'Operesheni ya hatua mbili imeshindwa.',
  'user.error.oauthServerNotConfigured': 'Seva ya OAuth "{{server}}" haijasanidiwa.',
  'user.error.oauthVerificationFailed': 'Uthibitishaji wa OAuth umeshindwa.',
  'user.error.failedToCreateUser': 'Imeshindwa kuunda mtumiaji.',
  'user.error.oauthLoginFailed': 'Kuingia kwa OAuth kumeshindwa.',
  'user.error.unauthorized': 'Hairuhusiwi',
  'user.error.passwordTooLong': 'Nenosiri lazima liwe na herufi zisizozidi {{max}}',
  'user.error.passwordTooShort': 'Nenosiri lazima liwe na angalau herufi {{min}}',
  'user.error.tooManyRequests': 'Majaribio mengi mno. Tafadhali subiri na ujaribu tena.',
  'user.error.webhookUnauthorized': 'Arifa ya malipo yasiyoidhinishwa',
  'user.error.credentialsNested':
    'Sehemu hii ya mwisho ya kuingia husoma vitambulisho katika kiwango cha juu, lakini mwili huu huviweka chini ya {{envelope}}. Weka sehemu ya kuingia kwenye njia inayofungua bahasha hii, au tumia createRequestHandler na mapRequest ili kufungua req.body[ {{envelope}}] kabla ya handlers.logIn.',
  'user.error.oauthStateMismatch':
    'Kutolingana kwa hali ya OAuth — shambulio linalowezekana la CSRF',
  'user.error.avatarTooLarge': 'Avatar lazima iwe na herufi {{max}} au chache zaidi.',
  'user.error.bioTooLong': 'Wasifu lazima uwe na herufi {{max}} au chache zaidi.',
  'user.error.noUpdatableFields': 'Hakuna sehemu zinazoweza kusasisha zilizotolewa.',
  'user.error.oauthDataInvalid': 'oauthData lazima iwe kitu.',
  'user.error.subscriptionActivationRequiresVerification':
    'Uanzishaji wa usajili lazima upitie uthibitisho wa risiti — tumia POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount':
    'Hakuna akaunti ya malipo ya {{provider}} iliyopatikana kwa mtumiaji huyu.',
  'user.payment.portalFailed': 'Haikuweza kufungua lango la malipo la {{provider}} .',
  'user.payment.portalNotSupported': '{{provider}} haitoi lango la malipo.',
  'user.payment.subscriptionOwnershipMismatch': 'Usajili huu si wa akaunti yako.',
  'user.payment.transactionAlreadyClaimed': 'Ununuzi huu tayari umehusishwa na akaunti nyingine.',
  'user.error.completeTargetMissing':
    'Hakuna akaunti iliyopo ikiwa na kitambulisho kilichotolewa kama Kitambulisho kamili.',
  'user.error.completeIdentityMismatch':
    'Jina la mtumiaji au barua pepe iliyotolewa haitambui akaunti kamili ya Kitambulisho.',
  'user.error.completeNotOwned':
    'Akaunti kamili ya Id huingia kupitia OAuth; sifa zake hazijatolewa hapa.',
  'user.error.identityRequired':
    'Utoaji unahitaji jina la mtumiaji au barua pepe ili kutambua akaunti.',
  'user.error.usernameEmailConflict':
    'Jina la mtumiaji na barua pepe ni mali ya akaunti mbili tofauti zilizopo.',
  'user.error.oauthEmailCollision':
    'Akaunti tayari ipo kwa barua pepe hii. Tafadhali ingia kwa kutumia njia yako ya asili, kisha unganisha mtoa huduma huyu kutoka kwa mipangilio ya akaunti yako.',
}
