import type { UserTranslations } from './types.js'

/** User translations for Filipino. */
export const fil: UserTranslations = {
  'user.error.badRequest': 'Hindi valid na request.',
  'user.error.notFound': 'Hindi nahanap.',
  'user.error.failedToCreateSession': 'Nabigo ang paglikha ng session.',
  'user.error.usernameRequired': 'Kailangan ang username.',
  'user.error.passwordRequired': 'Kailangan ang password.',
  'user.error.emailInvalid': 'Hindi valid ang email.',
  'user.error.usernameUnavailable': 'Hindi available ang username.',
  'user.error.emailAlreadyRegistered': 'Nakarehistro na ang email.',
  'user.error.failedToHashPassword': 'Nabigo ang pag-hash ng password.',
  'user.error.invalidCredentials': 'Hindi valid na mga credential.',
  'user.error.invalidTwoFactorToken': 'Hindi valid na two-factor token.',
  'user.error.twoFactorVerificationUnavailable': 'Hindi available ang two-factor verification.',
  'user.error.loginFailed': 'Nabigo ang pag-login.',
  'user.notification.newLogin': 'Bagong Login',
  'user.notification.newLoginBody': 'Bagong login mula sa {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Hindi maaaring walang laman ang username.',
  'user.error.usernameInvalid':
    'Ang username ay maaari lamang maglaman ng mga titik, numero, tuldok, gitling at underscore.',
  'user.error.bodyNestedUnderUser':
    'Inilalagay ng body na ito ang mga field nito sa ilalim ng "user"; ipadala ang username, email at password sa pinakamataas na antas.',
  'user.error.failedToUpdateUser': 'Nabigo ang pag-update ng user.',
  'user.error.failedToDeleteUser': 'Nabigo ang pagbura ng user.',
  'user.error.failedToReadUser': 'Nabigo ang pagbasa ng user.',
  'user.error.emailRequired': 'Kailangan ang email.',
  'user.email.passwordResetSubject': '{{appName}} - Pag-reset ng Password',
  'user.email.passwordResetText': 'Ang iyong token para sa pag-reset ng password ay: {{token}}',
  'user.email.passwordResetLink': 'I-reset ang iyong password sa: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Ang iyong token para sa pag-reset ng password ay: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">I-reset ang iyong password</a></p>',
  'user.error.failedToProcessPasswordReset': 'Nabigo ang pagproseso ng pag-reset ng password.',
  'user.error.newPasswordRequired': 'Kailangan ang bagong password.',
  'user.error.currentPasswordRequired': 'Kailangan ang kasalukuyang password.',
  'user.error.currentPasswordIncorrect': 'Hindi tama ang kasalukuyang password.',
  'user.error.failedToUpdatePassword': 'Nabigo ang pag-update ng password.',
  'user.error.planKeyRequired': 'Kailangan ang planKey.',
  'user.error.invalidPlan': 'Hindi valid na plan.',
  'user.error.failedToUpdateSubscription': 'Nabigo ang pag-update ng subscription.',
  'user.error.failedToUpdatePlan': 'Nabigo ang pag-update ng plan.',
  'user.error.twoFactorNotAvailable': 'Hindi available ang two-factor authentication.',
  'user.error.twoFactorRequiresPassword':
    'Naka-enable ang two-factor authentication sa account na ito. Mag-sign in gamit ang iyong email at password upang magpatuloy.',
  'user.error.tokenRequired': 'Kailangan ang token.',
  'user.error.noPendingTwoFactorSetup':
    'Walang pending na two-factor setup. Tumawag muna gamit ang action na "setup".',
  'user.error.invalidToken': 'Hindi valid na token.',
  'user.error.twoFactorRequired': 'Kailangan ang two-factor code.',
  'user.error.twoFactorNotEnabled': 'Hindi naka-enable ang two-factor.',
  'user.error.invalidAction': 'Hindi valid na action. Gamitin ang "setup", "enable", o "disable".',
  'user.error.twoFactorOperationFailed': 'Nabigo ang two-factor operation.',
  'user.error.oauthServerNotConfigured': 'Hindi naka-configure ang OAuth server na "{{server}}".',
  'user.error.oauthVerificationFailed': 'Nabigo ang OAuth verification.',
  'user.error.failedToCreateUser': 'Nabigo ang paglikha ng user.',
  'user.error.oauthLoginFailed': 'Nabigo ang OAuth login.',
  'user.error.unauthorized': 'Hindi awtorisado',
  'user.error.passwordTooLong': 'Ang password ay dapat na hindi hihigit sa {{max}} na karakter',
  'user.error.passwordTooShort': 'Ang password ay dapat na hindi bababa sa {{min}} na karakter',
  'user.error.tooManyRequests':
    'Masyadong maraming pagsubok. Mangyaring maghintay at subukan muli.',
  'user.error.webhookUnauthorized': 'Abiso sa hindi awtorisadong pagbabayad',
  'user.error.credentialsNested':
    'Binabasa ng login endpoint na ito ang mga kredensyal sa pinakamataas na antas, ngunit inilalagay ang mga ito sa ilalim ng {{envelope}}. Itakda ang loginEndpoint sa rutang magbubukas ng sobreng ito, o gamitin ang createRequestHandler gamit ang mapRequest para buksan ang req.body[ {{envelope}}] bago ang handlers.logIn.',
  'user.error.oauthStateMismatch':
    'Hindi pagtutugma ng estado ng OAuth — posibleng pag-atake ng CSRF',
  'user.error.avatarTooLarge': 'Ang avatar ay dapat na {{max}} na karakter o mas kaunti pa.',
  'user.error.bioTooLong': 'Ang bio ay dapat na {{max}} na karakter o mas kaunti pa.',
  'user.error.noUpdatableFields': 'Walang ibinigay na mga field na maaaring i-update.',
  'user.error.oauthDataInvalid': 'Ang oauthData ay dapat isang object.',
  'user.error.subscriptionActivationRequiresVerification':
    'Ang pag-activate ng subscription ay dapat dumaan sa beripikasyon ng resibo — gamitin ang POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount':
    'Walang nakitang account sa pagsingil para sa {{provider}} para sa user na ito.',
  'user.payment.portalFailed': 'Hindi mabuksan ang portal ng pagsingil ng {{provider}} .',
  'user.payment.portalNotSupported': 'Walang iniaalok na billing portal ang {{provider}} .',
  'user.payment.subscriptionOwnershipMismatch':
    'Ang subscription na ito ay hindi pagmamay-ari ng iyong account.',
  'user.payment.transactionAlreadyClaimed': 'Ang pagbiling ito ay nauugnay na sa isa pang account.',
  'user.error.completeTargetMissing':
    'Walang account na umiiral na may ibinigay na id bilang completeId.',
  'user.error.completeIdentityMismatch':
    'Hindi tinutukoy ng ibinigay na username o email ang kumpletong ID ng account.',
  'user.error.completeNotOwned':
    'Nagsa-sign in ang completeId account sa pamamagitan ng OAuth; hindi naka-provision dito ang mga credential nito.',
  'user.error.identityRequired':
    'Kailangan ng provisioning ng username o email para matukoy ang account.',
  'user.error.usernameEmailConflict':
    'Ang username at ang email ay pagmamay-ari ng dalawang magkaibang umiiral na account.',
  'user.error.oauthEmailCollision':
    'Mayroon nang account para sa email na ito. Mangyaring mag-sign in gamit ang iyong orihinal na paraan, pagkatapos ay i-link ang provider na ito mula sa mga setting ng iyong account.',
}
