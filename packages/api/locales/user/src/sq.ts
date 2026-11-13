import type { UserTranslations } from './types.js'

/** User translations for Albanian. */
export const sq: UserTranslations = {
  'user.error.badRequest': 'Kerkese e keqe.',
  'user.error.notFound': 'Nuk u gjet.',
  'user.error.failedToCreateSession': 'Deshtoi krijimi i sesionit.',
  'user.error.usernameRequired': 'Kerkohet emri i perdoruesit.',
  'user.error.passwordRequired': 'Kerkohet fjalekalimi.',
  'user.error.emailInvalid': 'Email-i eshte i pavlefshem.',
  'user.error.usernameUnavailable': 'Emri i perdoruesit nuk eshte i disponueshem.',
  'user.error.emailAlreadyRegistered': 'Email-i eshte tashme i regjistruar.',
  'user.error.failedToHashPassword': 'Deshtoi hash-imi i fjalekalimit.',
  'user.error.invalidCredentials': 'Kredenciale te pavlefshme.',
  'user.error.invalidTwoFactorToken': 'Token dyfaktor i pavlefshem.',
  'user.error.twoFactorVerificationUnavailable': 'Verifikimi dyfaktor nuk eshte i disponueshem.',
  'user.error.loginFailed': 'Hyrja deshtoi.',
  'user.notification.newLogin': 'Hyrje e Re',
  'user.notification.newLoginBody': 'Hyrje e re nga {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Emri i perdoruesit nuk mund te jete bosh.',
  'user.error.usernameInvalid':
    'Emri i përdoruesit mund të përmbajë vetëm shkronja, numra, pika, viza dhe nënvizime.',
  'user.error.bodyNestedUnderUser':
    'Ky trup i fut fushat e tij nën "user"; dërgoni emrin e përdoruesit, email-in dhe fjalëkalimin në nivelin më të lartë.',
  'user.error.failedToUpdateUser': 'Deshtoi perditesimi i perdoruesit.',
  'user.error.failedToDeleteUser': 'Deshtoi fshirja e perdoruesit.',
  'user.error.failedToReadUser': 'Deshtoi leximi i perdoruesit.',
  'user.error.emailRequired': 'Kerkohet email-i.',
  'user.email.passwordResetSubject': '{{appName}} - Rivendosja e Fjalekalimit',
  'user.email.passwordResetText': 'Token-i juaj i rivendosjes se fjalekalimit eshte: {{token}}',
  'user.email.passwordResetLink': 'Rivendosni fjalekalimin tuaj ne: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Token-i juaj i rivendosjes se fjalekalimit eshte: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Rivendosni fjalekalimin tuaj</a></p>',
  'user.error.failedToProcessPasswordReset': 'Deshtoi perpunimi i rivendosjes se fjalekalimit.',
  'user.error.newPasswordRequired': 'Kerkohet fjalekalimi i ri.',
  'user.error.currentPasswordRequired': 'Kerkohet fjalekalimi aktual.',
  'user.error.currentPasswordIncorrect': 'Fjalekalimi aktual eshte i pasakte.',
  'user.error.failedToUpdatePassword': 'Deshtoi perditesimi i fjalekalimit.',
  'user.error.planKeyRequired': 'Kerkohet planKey.',
  'user.error.invalidPlan': 'Plan i pavlefshem.',
  'user.error.failedToUpdateSubscription': 'Deshtoi perditesimi i abonimit.',
  'user.error.failedToUpdatePlan': 'Deshtoi perditesimi i planit.',
  'user.error.twoFactorNotAvailable': 'Autentifikimi dyfaktor nuk eshte i disponueshem.',
  'user.error.twoFactorRequiresPassword':
    'Autentifikimi dyfaktor eshte i aktivizuar ne kete llogari. Identifikohuni me email dhe fjalekalimin tuaj per te vazhduar.',
  'user.error.tokenRequired': 'Kerkohet tokeni.',
  'user.error.noPendingTwoFactorSetup':
    'Nuk ka vendosje dyfaktor ne pritje. Thirrni me veprimin "setup" fillimisht.',
  'user.error.invalidToken': 'Token i pavlefshem.',
  'user.error.twoFactorRequired': 'Kerkohet nje kod dyfaktor.',
  'user.error.twoFactorNotEnabled': 'Dyfaktori nuk eshte i aktivizuar.',
  'user.error.invalidAction': 'Veprim i pavlefshem. Perdorni "setup", "enable" ose "disable".',
  'user.error.twoFactorOperationFailed': 'Veprimi dyfaktor deshtoi.',
  'user.error.oauthServerNotConfigured': 'Serveri OAuth "{{server}}" nuk eshte konfiguruar.',
  'user.error.oauthVerificationFailed': 'Verifikimi OAuth deshtoi.',
  'user.error.failedToCreateUser': 'Deshtoi krijimi i perdoruesit.',
  'user.error.oauthLoginFailed': 'Hyrja OAuth deshtoi.',
  'user.error.unauthorized': 'I paautorizuar',
  'user.error.passwordTooLong': 'Fjalëkalimi duhet të jetë maksimumi {{max}} karaktere',
  'user.error.passwordTooShort': 'Fjalëkalimi duhet të jetë të paktën {{min}} karaktere',
  'user.error.tooManyRequests': 'Shumë përpjekje. Ju lutemi prisni dhe provoni përsëri.',
  'user.error.webhookUnauthorized': 'Njoftim për pagesë të paautorizuar',
  'user.error.credentialsNested':
    'Kjo pikë fundore e hyrjes lexon kredencialet në nivelin më të lartë, por ky trup i vendos ato nën {{envelope}}. Vendos loginEndpoint në rrugën që e hap këtë zarf, ose përdor createRequestHandler me mapRequest për të hapur req.body[ {{envelope}}] para handlers.logIn.',
  'user.error.oauthStateMismatch': 'Mospërputhje e gjendjes OAuth — sulm i mundshëm CSRF',
  'user.error.avatarTooLarge': 'Avatari duhet të ketë {{max}} karaktere ose më pak.',
  'user.error.bioTooLong': 'Biografia duhet të ketë {{max}} karaktere ose më pak.',
  'user.error.noUpdatableFields': 'Nuk u dhanë fusha të përditësueshme.',
  'user.error.oauthDataInvalid': 'oauthData duhet të jetë një objekt.',
  'user.error.subscriptionActivationRequiresVerification':
    'Aktivizimi i abonimit duhet të kalojë nëpër verifikimin e faturës — përdorni POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount':
    'Nuk u gjet asnjë llogari faturimi {{provider}} për këtë përdorues.',
  'user.payment.portalFailed': 'Nuk mund të hapet portalin e faturimit {{provider}} .',
  'user.payment.portalNotSupported': '{{provider}} nuk ofron një portal faturimi.',
  'user.payment.subscriptionOwnershipMismatch': 'Ky abonim nuk i përket llogarisë suaj.',
  'user.payment.transactionAlreadyClaimed':
    'Kjo blerje është tashmë e lidhur me një llogari tjetër.',
  'user.error.completeTargetMissing': 'Nuk ekziston asnjë llogari me ID-në e dhënë si CompleteId.',
  'user.error.completeIdentityMismatch':
    'Emri i përdoruesit ose email-i i dhënë nuk e identifikon llogarinë completeId.',
  'user.error.completeNotOwned':
    'Llogaria completeId identifikohet përmes OAuth; kredencialet e saj nuk jepen këtu.',
  'user.error.identityRequired':
    'Përgatitja kërkon një emër përdoruesi ose një email për të identifikuar llogarinë.',
  'user.error.usernameEmailConflict':
    'Emri i përdoruesit dhe emaili i përkasin dy llogarive të ndryshme ekzistuese.',
  'user.error.oauthEmailCollision':
    'Një llogari ekziston tashmë për këtë email. Ju lutemi identifikoheni me metodën tuaj origjinale dhe më pas lidhni këtë ofrues nga cilësimet e llogarisë suaj.',
}
