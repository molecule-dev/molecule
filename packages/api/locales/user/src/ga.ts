import type { UserTranslations } from './types.js'

/** User translations for Irish. */
export const ga: UserTranslations = {
  'user.error.badRequest': 'Droch-iarratas.',
  'user.error.notFound': 'Gan aimsiú.',
  'user.error.failedToCreateSession': 'Theip ar chruthú seisiúin.',
  'user.error.usernameRequired': 'Tá ainm úsáideora ag teastáil.',
  'user.error.passwordRequired': 'Tá pasfhocal ag teastáil.',
  'user.error.emailInvalid': 'Ríomhphost neamhbhailí.',
  'user.error.usernameUnavailable': 'Ainm úsáideora nach bhfuil ar fáil.',
  'user.error.emailAlreadyRegistered': 'Ríomhphost cláraithe cheana féin.',
  'user.error.failedToHashPassword': 'Theip ar haiseáil pasfhocail.',
  'user.error.invalidCredentials': 'Dintiúir neamhbhailí.',
  'user.error.invalidTwoFactorToken': 'Comhartha dhá-fhachtóir neamhbhailí.',
  'user.error.twoFactorVerificationUnavailable': 'Fíorú dhá-fhachtóir nach bhfuil ar fáil.',
  'user.error.loginFailed': 'Theip ar logáil isteach.',
  'user.notification.newLogin': 'Logáil Isteach Nua',
  'user.notification.newLoginBody': 'Logáil isteach nua ó {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Ní féidir le hainm úsáideora a bheith folamh.',
  'user.error.usernameInvalid':
    'Ní féidir ach litreacha, uimhreacha, poncanna, fleiscíní agus fostríocanna a bheith in ainm úsáideora.',
  'user.error.bodyNestedUnderUser':
    'Neadaíonn an corp seo a réimsí faoi "user"; seol ainm úsáideora, ríomhphost agus pasfhocal ag an mbarrleibhéal.',
  'user.error.failedToUpdateUser': 'Theip ar nuashonrú úsáideora.',
  'user.error.failedToDeleteUser': 'Theip ar scriosadh úsáideora.',
  'user.error.failedToReadUser': 'Theip ar léamh úsáideora.',
  'user.error.emailRequired': 'Tá ríomhphost ag teastáil.',
  'user.email.passwordResetSubject': '{{appName}} - Athshocrú Pasfhocail',
  'user.email.passwordResetText': 'Is é do chomhartha athshocrú pasfhocail: {{token}}',
  'user.email.passwordResetLink': 'Athshocraigh do phasfhocal ag: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Is é do chomhartha athshocrú pasfhocail: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Athshocraigh do phasfhocal</a></p>',
  'user.error.failedToProcessPasswordReset': 'Theip ar phróiseáil athshocrú pasfhocail.',
  'user.error.newPasswordRequired': 'Tá pasfhocal nua ag teastáil.',
  'user.error.currentPasswordRequired': 'Tá pasfhocal reatha ag teastáil.',
  'user.error.currentPasswordIncorrect': 'Pasfhocal reatha mícheart.',
  'user.error.failedToUpdatePassword': 'Theip ar nuashonrú pasfhocail.',
  'user.error.planKeyRequired': 'Tá planKey ag teastáil.',
  'user.error.invalidPlan': 'Plean neamhbhailí.',
  'user.error.failedToUpdateSubscription': 'Theip ar nuashonrú síntiúis.',
  'user.error.failedToUpdatePlan': 'Theip ar nuashonrú pleain.',
  'user.error.twoFactorNotAvailable': 'Fíordheimhniú dhá-fhachtóir nach bhfuil ar fáil.',
  'user.error.twoFactorRequiresPassword':
    'Tá fíordheimhniú dhá-fhachtóir cumasaithe ar an gcuntas seo. Sínigh isteach le do ríomhphost agus do phasfhocal chun leanúint ar aghaidh.',
  'user.error.tokenRequired': 'Tá comhartha ag teastáil.',
  'user.error.noPendingTwoFactorSetup':
    'Gan socrú dhá-fhachtóir ar feitheamh. Glaoigh le gníomh "setup" ar dtús.',
  'user.error.invalidToken': 'Comhartha neamhbhailí.',
  'user.error.twoFactorRequired': 'Tá cód dhá-fhachtóir ag teastáil.',
  'user.error.twoFactorNotEnabled': 'Dhá-fhachtóir gan chumasú.',
  'user.error.invalidAction': 'Gníomh neamhbhailí. Úsáid "setup", "enable", nó "disable".',
  'user.error.twoFactorOperationFailed': 'Theip ar oibríocht dhá-fhachtóir.',
  'user.error.oauthServerNotConfigured': 'Freastalaí OAuth "{{server}}" gan chumrú.',
  'user.error.oauthVerificationFailed': 'Theip ar fhíorú OAuth.',
  'user.error.failedToCreateUser': 'Theip ar chruthú úsáideora.',
  'user.error.oauthLoginFailed': 'Theip ar logáil isteach OAuth.',
  'user.error.unauthorized': 'Neamhúdaraithe',
  'user.error.passwordTooLong': 'Ní mór an focal faire a bheith {{max}} carachtar ar a mhéad',
  'user.error.passwordTooShort': 'Ní mór don phasfhocal {{min}} carachtar ar a laghad a bheith ann',
  'user.error.tooManyRequests': 'An iomarca iarrachtaí. Fan agus déan iarracht arís.',
  'user.error.webhookUnauthorized': 'Fógra íocaíochta neamhúdaraithe',
  'user.error.credentialsNested':
    'Léann an pointe deiridh logála isteach seo dintiúir ag an leibhéal is airde, ach neadaíonn an corp seo iad faoi {{envelope}}. Socraigh loginEndpoint chuig an mbealach a dhífhillfidh an clúdach seo, nó bain úsáid as createRequestHandler le mapRequest chun req.body[ {{envelope}}] a dhífhilleadh roimh handlers.logIn.',
  'user.error.oauthStateMismatch': 'Neamhoiriúnacht stáit OAuth — ionsaí CSRF féideartha',
  'user.error.avatarTooLarge': 'Ní mór don avatar {{max}} carachtar nó níos lú a bheith ann.',
  'user.error.bioTooLong': 'Ní mór do bheathaisnéis a bheith {{max}} carachtar nó níos lú.',
  'user.error.noUpdatableFields': 'Níor soláthraíodh aon réimsí in-nuashonraithe.',
  'user.error.oauthDataInvalid': 'Ní mór do oauthData a bheith ina réad.',
  'user.error.subscriptionActivationRequiresVerification':
    'Ní mór fíorú admhála a dhéanamh chun an síntiús a ghníomhachtú — bain úsáid as POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount': 'Níor aimsíodh cuntas billeála {{provider}} don úsáideoir seo.',
  'user.payment.portalFailed': 'Níorbh fhéidir tairseach billeála {{provider}} a oscailt.',
  'user.payment.portalNotSupported': 'Ní thairgeann {{provider}} tairseach billeála.',
  'user.payment.subscriptionOwnershipMismatch': 'Ní bhaineann an síntiús seo le do chuntas.',
  'user.payment.transactionAlreadyClaimed':
    'Tá an ceannachán seo ceangailte le cuntas eile cheana féin.',
  'user.error.completeTargetMissing':
    'Níl aon chuntas ann leis an aitheantas a cuireadh ar fáil mar completeId.',
  'user.error.completeIdentityMismatch':
    'Ní aithníonn an t-ainm úsáideora ná an ríomhphost a cuireadh ar fáil an cuntas completeId.',
  'user.error.completeNotOwned':
    'Síníonn an cuntas completeId isteach trí OAuth; níl a chuid dintiúir curtha ar fáil anseo.',
  'user.error.identityRequired':
    'Teastaíonn ainm úsáideora nó ríomhphost chun an cuntas a aithint le haghaidh soláthair.',
  'user.error.usernameEmailConflict':
    'Baineann an t-ainm úsáideora agus an ríomhphost le dhá chuntas éagsúla atá ann cheana féin.',
  'user.error.oauthEmailCollision':
    'Tá cuntas ann cheana féin don ríomhphost seo. Sínigh isteach le do mhodh bunaidh, agus ansin nasc an soláthraí seo ó shocruithe do chuntais.',
}
