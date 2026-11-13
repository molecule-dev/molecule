import type { UserTranslations } from './types.js'

/** User translations for Belarusian. */
export const be: UserTranslations = {
  'user.error.badRequest': 'Няправільны запыт.',
  'user.error.notFound': 'Не знойдзена.',
  'user.error.failedToCreateSession': 'Не ўдалося стварыць сесію.',
  'user.error.usernameRequired': 'Імя карыстальніка абавязковае.',
  'user.error.passwordRequired': 'Пароль абавязковы.',
  'user.error.emailInvalid': 'Электронная пошта няправільная.',
  'user.error.usernameUnavailable': 'Імя карыстальніка недаступнае.',
  'user.error.emailAlreadyRegistered': 'Электронная пошта ўжо зарэгістравана.',
  'user.error.failedToHashPassword': 'Не ўдалося хэшаваць пароль.',
  'user.error.invalidCredentials': 'Няправільныя ўліковыя дадзеныя.',
  'user.error.invalidTwoFactorToken': 'Няправільны токен двухфактарнай аўтэнтыфікацыі.',
  'user.error.twoFactorVerificationUnavailable': 'Двухфактарная верыфікацыя недаступная.',
  'user.error.loginFailed': 'Уваход не ўдаўся.',
  'user.notification.newLogin': 'Новы ўваход',
  'user.notification.newLoginBody': 'Новы ўваход з {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Імя карыстальніка не можа быць пустым.',
  'user.error.usernameInvalid':
    'Імя карыстальніка можа ўтрымліваць толькі літары, лічбы, кропкі, злучкі і падкрэсліванні.',
  'user.error.bodyNestedUnderUser':
    'Гэты запыт укладвае палі ў "user"; адпраўце імя карыстальніка, электронную пошту і пароль на верхнім узроўні.',
  'user.error.failedToUpdateUser': 'Не ўдалося абнавіць карыстальніка.',
  'user.error.failedToDeleteUser': 'Не ўдалося выдаліць карыстальніка.',
  'user.error.failedToReadUser': 'Не ўдалося прачытаць карыстальніка.',
  'user.error.emailRequired': 'Электронная пошта абавязковая.',
  'user.email.passwordResetSubject': '{{appName}} - Скід пароля',
  'user.email.passwordResetText': 'Ваш токен скіду пароля: {{token}}',
  'user.email.passwordResetLink': 'Скіньце пароль па адрасе: {{url}}',
  'user.email.passwordResetHtml': '<p>Ваш токен скіду пароля: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Скінуць пароль</a></p>',
  'user.error.failedToProcessPasswordReset': 'Не ўдалося апрацаваць скід пароля.',
  'user.error.newPasswordRequired': 'Новы пароль абавязковы.',
  'user.error.currentPasswordRequired': 'Бягучы пароль абавязковы.',
  'user.error.currentPasswordIncorrect': 'Бягучы пароль няправільны.',
  'user.error.failedToUpdatePassword': 'Не ўдалося абнавіць пароль.',
  'user.error.planKeyRequired': 'planKey абавязковы.',
  'user.error.invalidPlan': 'Няправільны план.',
  'user.error.failedToUpdateSubscription': 'Не ўдалося абнавіць падпіску.',
  'user.error.failedToUpdatePlan': 'Не ўдалося абнавіць план.',
  'user.error.twoFactorNotAvailable': 'Двухфактарная аўтэнтыфікацыя недаступная.',
  'user.error.twoFactorRequiresPassword':
    'Двухфактарная аўтэнтыфікацыя ўключана для гэтага ўліковага запісу. Каб працягнуць, увайдзіце з дапамогай электроннай пошты і пароля.',
  'user.error.tokenRequired': 'Токен абавязковы.',
  'user.error.noPendingTwoFactorSetup':
    'Няма чакаючай наладкі двухфактарнай аўтэнтыфікацыі. Спачатку выклічце з дзеяннем "setup".',
  'user.error.invalidToken': 'Няправільны токен.',
  'user.error.twoFactorRequired': 'Патрабуецца код двухфактарнай аўтэнтыфікацыі.',
  'user.error.twoFactorNotEnabled': 'Двухфактарная аўтэнтыфікацыя не ўключана.',
  'user.error.invalidAction':
    'Няправільнае дзеянне. Выкарыстоўвайце "setup", "enable" або "disable".',
  'user.error.twoFactorOperationFailed': 'Аперацыя двухфактарнай аўтэнтыфікацыі не ўдалася.',
  'user.error.oauthServerNotConfigured': 'OAuth сервер "{{server}}" не настроены.',
  'user.error.oauthVerificationFailed': 'Верыфікацыя OAuth не ўдалася.',
  'user.error.failedToCreateUser': 'Не ўдалося стварыць карыстальніка.',
  'user.error.oauthLoginFailed': 'Уваход OAuth не ўдаўся.',
  'user.error.unauthorized': 'Несанкцыянаваны',
  'user.error.passwordTooLong': 'Пароль павінен утрымліваць не больш за {{max}} сімвалаў',
  'user.error.passwordTooShort': 'Пароль павінен утрымліваць не менш за {{min}} сімвалаў',
  'user.error.tooManyRequests': 'Занадта шмат спроб. Пачакайце і паспрабуйце яшчэ раз.',
  'user.error.webhookUnauthorized': 'Паведамленне аб несанкцыянаваным плацяжы',
  'user.error.credentialsNested':
    'Гэтая канцавая кропка ўваходу зчытвае ўліковыя дадзеныя на самым высокім узроўні, але гэта цела змяшчае іх у {{envelope}}. Усталюйце loginEndpoint на маршрут, які разгортвае гэтую абалонку, або выкарыстоўвайце createRequestHandler з mapRequest, каб разгарнуць req.body[ {{envelope}}] перад handlers.logIn.',
  'user.error.oauthStateMismatch': 'Неадпаведнасць стану OAuth — магчымая атака CSRF',
  'user.error.avatarTooLarge': 'Аватар павінен утрымліваць не больш за {{max}} сімвалаў.',
  'user.error.bioTooLong': 'Біяграфія павінна ўтрымліваць не больш за {{max}} сімвалаў.',
  'user.error.noUpdatableFields': 'Абнаўляльныя палі не былі прадастаўлены.',
  'user.error.oauthDataInvalid': "oauthData павінен быць аб'ектам.",
  'user.error.subscriptionActivationRequiresVerification':
    'Актывацыя падпіскі павінна прайсці праверку квітанцыі — выкарыстоўвайце POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount':
    'Для гэтага карыстальніка не знойдзены плацежны рахунак {{provider}} .',
  'user.payment.portalFailed': 'Не ўдалося адкрыць партал аплаты {{provider}} .',
  'user.payment.portalNotSupported': '{{provider}} не прапануе партал для выстаўлення рахункаў.',
  'user.payment.subscriptionOwnershipMismatch': 'Гэтая падпіска не належыць вашаму акаўнту.',
  'user.payment.transactionAlreadyClaimed': 'Гэтая пакупка ўжо звязана з іншым акаўнтам.',
  'user.error.completeTargetMissing':
    'Уліковага запісу з ідэнтыфікатарам, указаным як completeId, не існуе.',
  'user.error.completeIdentityMismatch':
    'Пададзенае імя карыстальніка або адрас электроннай пошты не ідэнтыфікуюць уліковы запіс completeId.',
  'user.error.completeNotOwned':
    'Уліковы запіс completeId уваходзіць праз OAuth; яго ўліковыя дадзеныя тут не прадастаўляюцца.',
  'user.error.identityRequired':
    'Для ідэнтыфікацыі ўліковага запісу патрабуецца імя карыстальніка або адрас электроннай пошты.',
  'user.error.usernameEmailConflict':
    'Імя карыстальніка і адрас электроннай пошты належаць двум розным існуючым акаўнтам.',
  'user.error.oauthEmailCollision':
    'Для гэтага адраса электроннай пошты ўжо існуе ўліковы запіс. Калі ласка, увайдзіце, выкарыстоўваючы свой зыходны метад, а затым прывяжыце гэтага пастаўшчыка ў наладах уліковага запісу.',
}
