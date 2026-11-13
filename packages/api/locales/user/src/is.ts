import type { UserTranslations } from './types.js'

/** User translations for Icelandic. */
export const is: UserTranslations = {
  'user.error.badRequest': 'Ógild beiðni.',
  'user.error.notFound': 'Fannst ekki.',
  'user.error.failedToCreateSession': 'Mistókst að búa til setu.',
  'user.error.usernameRequired': 'Notandanafn er nauðsynlegt.',
  'user.error.passwordRequired': 'Lykilorð er nauðsynlegt.',
  'user.error.emailInvalid': 'Netfang er ógilt.',
  'user.error.usernameUnavailable': 'Notandanafn er ekki tiltækt.',
  'user.error.emailAlreadyRegistered': 'Netfang er þegar skráð.',
  'user.error.failedToHashPassword': 'Mistókst að dulkóða lykilorð.',
  'user.error.invalidCredentials': 'Ógild skilríki.',
  'user.error.invalidTwoFactorToken': 'Ógilt tveggja-þátta merki.',
  'user.error.twoFactorVerificationUnavailable': 'Tveggja-þátta staðfesting ótiltæk.',
  'user.error.loginFailed': 'Innskráning mistókst.',
  'user.notification.newLogin': 'Ný innskráning',
  'user.notification.newLoginBody': 'Ný innskráning frá {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Notandanafn má ekki vera autt.',
  'user.error.usernameInvalid':
    'Notandanafn má aðeins innihalda bókstafi, tölustafi, punkta, bandstrik og undirstrik.',
  'user.error.bodyNestedUnderUser':
    'Þessi beiðni hreiðrar reitina sína undir "user"; sendu notandanafn, netfang og lykilorð á efsta stigi.',
  'user.error.failedToUpdateUser': 'Mistókst að uppfæra notanda.',
  'user.error.failedToDeleteUser': 'Mistókst að eyða notanda.',
  'user.error.failedToReadUser': 'Mistókst að lesa notanda.',
  'user.error.emailRequired': 'Netfang er nauðsynlegt.',
  'user.email.passwordResetSubject': '{{appName}} - Endurstilling lykilorðs',
  'user.email.passwordResetText': 'Endurstillingarmerki lykilorðs þíns er: {{token}}',
  'user.email.passwordResetLink': 'Endurstilltu lykilorðið þitt á: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Endurstillingarmerki lykilorðs þíns er: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Endurstilltu lykilorðið þitt</a></p>',
  'user.error.failedToProcessPasswordReset': 'Mistókst að vinna úr endurstillingu lykilorðs.',
  'user.error.newPasswordRequired': 'Nýtt lykilorð er nauðsynlegt.',
  'user.error.currentPasswordRequired': 'Núverandi lykilorð er nauðsynlegt.',
  'user.error.currentPasswordIncorrect': 'Núverandi lykilorð er rangt.',
  'user.error.failedToUpdatePassword': 'Mistókst að uppfæra lykilorð.',
  'user.error.planKeyRequired': 'planKey er nauðsynlegt.',
  'user.error.invalidPlan': 'Ógild áætlun.',
  'user.error.failedToUpdateSubscription': 'Mistókst að uppfæra áskrift.',
  'user.error.failedToUpdatePlan': 'Mistókst að uppfæra áætlun.',
  'user.error.twoFactorNotAvailable': 'Tveggja-þátta auðkenning er ekki tiltæk.',
  'user.error.twoFactorRequiresPassword':
    'Tveggja-þátta auðkenning er virk á þessum aðgangi. Skráðu þig inn með netfangi og lykilorði til að halda áfram.',
  'user.error.tokenRequired': 'Merki er nauðsynlegt.',
  'user.error.noPendingTwoFactorSetup':
    'Engin tveggja-þátta uppsetning í bið. Kallaðu fyrst með aðgerðinni "setup".',
  'user.error.invalidToken': 'Ógilt merki.',
  'user.error.twoFactorRequired': 'Tveggja-þátta kóði er nauðsynlegur.',
  'user.error.twoFactorNotEnabled': 'Tveggja-þátta er ekki virkt.',
  'user.error.invalidAction': 'Ógild aðgerð. Notaðu "setup", "enable" eða "disable".',
  'user.error.twoFactorOperationFailed': 'Tveggja-þátta aðgerð mistókst.',
  'user.error.oauthServerNotConfigured': 'OAuth-þjónn "{{server}}" er ekki stilltur.',
  'user.error.oauthVerificationFailed': 'OAuth-staðfesting mistókst.',
  'user.error.failedToCreateUser': 'Mistókst að búa til notanda.',
  'user.error.oauthLoginFailed': 'OAuth-innskráning mistókst.',
  'user.error.unauthorized': 'Óheimilt',
  'user.error.passwordTooLong': 'Lykilorðið má ekki vera lengra en {{max}} stafir',
  'user.error.passwordTooShort': 'Lykilorðið verður að vera að minnsta kosti {{min}} stafir',
  'user.error.tooManyRequests': 'Of margar tilraunir. Vinsamlegast bíðið og reynið aftur.',
  'user.error.webhookUnauthorized': 'Tilkynning um óheimilaða greiðslu',
  'user.error.credentialsNested':
    'Þessi innskráningarendapunktur les innskráningarupplýsingar á efsta stigi, en þessi meginmál setur þær undir {{envelope}}. Stilltu loginEndpoint á leiðina sem opnar þessa umslag, eða notaðu createRequestHandler með mapRequest til að opna req.body[ {{envelope}}] á undan handlers.logIn.',
  'user.error.oauthStateMismatch': 'Ósamræmi í OAuth-stöðu — möguleg CSRF-árás',
  'user.error.avatarTooLarge': 'Avatar má vera {{max}} stafir eða færri.',
  'user.error.bioTooLong': 'Æviágrip verður að vera {{max}} stafir eða færri.',
  'user.error.noUpdatableFields': 'Engir uppfæranlegir reitir voru gefnir upp.',
  'user.error.oauthDataInvalid': 'oauthData verður að vera hlutur.',
  'user.error.subscriptionActivationRequiresVerification':
    'Virkjun áskriftar verður að fara í gegnum staðfestingu kvittunar — notið POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount':
    'Enginn reikningur fyrir {{provider}} fannst fyrir þennan notanda.',
  'user.payment.portalFailed': 'Ekki tókst að opna greiðslugáttina hjá {{provider}} .',
  'user.payment.portalNotSupported': '{{provider}} býður ekki upp á greiðslugátt.',
  'user.payment.subscriptionOwnershipMismatch': 'Þessi áskrift tilheyrir ekki reikningnum þínum.',
  'user.payment.transactionAlreadyClaimed': 'Þessi kaup eru þegar tengd öðrum reikningi.',
  'user.error.completeTargetMissing':
    'Enginn reikningur er til með auðkenninu sem gefið er upp sem completeId.',
  'user.error.completeIdentityMismatch':
    'Notandanafnið eða netfangið sem gefið var upp auðkennir ekki completeId reikninginn.',
  'user.error.completeNotOwned':
    'completeId reikningurinn skráir sig inn í gegnum OAuth; innskráningarupplýsingar hans eru ekki gefnar hér.',
  'user.error.identityRequired':
    'Til að úthluta þarf notandanafn eða netfang til að bera kennsl á reikninginn.',
  'user.error.usernameEmailConflict':
    'Notandanafnið og netfangið tilheyra tveimur mismunandi núverandi reikningum.',
  'user.error.oauthEmailCollision':
    'Aðgangur er þegar til staðar fyrir þetta netfang. Vinsamlegast skráðu þig inn með upprunalegu aðferðinni þinni og tengdu síðan þennan þjónustuaðila úr stillingum reikningsins.',
}
