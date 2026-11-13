import type { UserTranslations } from './types.js'

/** User translations for Kyrgyz. */
export const ky: UserTranslations = {
  'user.error.badRequest': 'Жаман суроо.',
  'user.error.notFound': 'Табылган жок.',
  'user.error.failedToCreateSession': 'Сессия түзүү ишке ашкан жок.',
  'user.error.usernameRequired': 'Колдонуучу аты талап кылынат.',
  'user.error.passwordRequired': 'Сыр сөз талап кылынат.',
  'user.error.emailInvalid': 'Email жараксыз.',
  'user.error.usernameUnavailable': 'Колдонуучу аты жеткиликсиз.',
  'user.error.emailAlreadyRegistered': 'Email мурунтан катталган.',
  'user.error.failedToHashPassword': 'Сыр сөздү хэштөө ишке ашкан жок.',
  'user.error.invalidCredentials': 'Жараксыз ишеним грамоталары.',
  'user.error.invalidTwoFactorToken': 'Жараксыз эки факторлуу токен.',
  'user.error.twoFactorVerificationUnavailable': 'Эки факторлуу текшерүү жеткиликсиз.',
  'user.error.loginFailed': 'Кирүү ишке ашкан жок.',
  'user.notification.newLogin': 'Жаңы кирүү',
  'user.notification.newLoginBody': '{{deviceName}} түзмөгүнөн жаңы кирүү.',
  'user.error.usernameCannotBeEmpty': 'Колдонуучу аты бош болбошу керек.',
  'user.error.usernameInvalid':
    'Колдонуучунун аты тамгаларды, сандарды, чекиттерди, сызыкчаларды жана астыңкы сызыктарды гана камтый алат.',
  'user.error.bodyNestedUnderUser':
    'Бул суроо талаалорун "user" ичине жайгаштырат; колдонуучунун атын, электрондук почтаны жана сырсөздү жогорку деңгээлде жөнөтүңүз.',
  'user.error.failedToUpdateUser': 'Колдонуучуну жаңыртуу ишке ашкан жок.',
  'user.error.failedToDeleteUser': 'Колдонуучуну өчүрүү ишке ашкан жок.',
  'user.error.failedToReadUser': 'Колдонуучуну окуу ишке ашкан жок.',
  'user.error.emailRequired': 'Email талап кылынат.',
  'user.email.passwordResetSubject': '{{appName}} - Сыр сөздү калыбына келтирүү',
  'user.email.passwordResetText': 'Сыр сөздү калыбына келтирүү токениңиз: {{token}}',
  'user.email.passwordResetLink': 'Сыр сөзүңүздү калыбына келтириңиз: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Сыр сөздү калыбына келтирүү токениңиз: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink':
    '<p><a href="{{url}}">Сыр сөзүңүздү калыбына келтириңиз</a></p>',
  'user.error.failedToProcessPasswordReset':
    'Сыр сөздү калыбына келтирүүнү иштетүү ишке ашкан жок.',
  'user.error.newPasswordRequired': 'Жаңы сыр сөз талап кылынат.',
  'user.error.currentPasswordRequired': 'Учурдагы сыр сөз талап кылынат.',
  'user.error.currentPasswordIncorrect': 'Учурдагы сыр сөз туура эмес.',
  'user.error.failedToUpdatePassword': 'Сыр сөздү жаңыртуу ишке ашкан жок.',
  'user.error.planKeyRequired': 'planKey талап кылынат.',
  'user.error.invalidPlan': 'Жараксыз план.',
  'user.error.failedToUpdateSubscription': 'Жазылууну жаңыртуу ишке ашкан жок.',
  'user.error.failedToUpdatePlan': 'Планды жаңыртуу ишке ашкан жок.',
  'user.error.twoFactorNotAvailable': 'Эки факторлуу аутентификация жеткиликсиз.',
  'user.error.twoFactorRequiresPassword':
    'Бул аккаунтта эки факторлуу аутентификация иштетилген. Улантуу үчүн электрондук почтаңыз жана сырсөзүңүз менен кириңиз.',
  'user.error.tokenRequired': 'Токен талап кылынат.',
  'user.error.noPendingTwoFactorSetup':
    'Күтүлүп жаткан эки факторлуу орнотуу жок. Адегенде "setup" аракети менен чакырыңыз.',
  'user.error.invalidToken': 'Жараксыз токен.',
  'user.error.twoFactorRequired': 'Эки факторлуу код талап кылынат.',
  'user.error.twoFactorNotEnabled': 'Эки факторлуу аутентификация иштетилген эмес.',
  'user.error.invalidAction': 'Жараксыз аракет. "setup", "enable" же "disable" колдонуңуз.',
  'user.error.twoFactorOperationFailed': 'Эки факторлуу операция ишке ашкан жок.',
  'user.error.oauthServerNotConfigured': 'OAuth сервери "{{server}}" конфигурацияланган эмес.',
  'user.error.oauthVerificationFailed': 'OAuth текшерүүсү ишке ашкан жок.',
  'user.error.failedToCreateUser': 'Колдонуучуну түзүү ишке ашкан жок.',
  'user.error.oauthLoginFailed': 'OAuth кирүү ишке ашкан жок.',
  'user.error.unauthorized': 'Уруксатсыз',
  'user.error.passwordTooLong': 'Сырсөз эң көп дегенде {{max}} белгиден турушу керек',
  'user.error.passwordTooShort': 'Сырсөз кеминде {{min}} белгиден турушу керек',
  'user.error.tooManyRequests': 'Өтө көп аракет жасалды. Күтө туруп, кайра аракет кылыңыз.',
  'user.error.webhookUnauthorized': 'Уруксатсыз төлөм жөнүндө билдирүү',
  'user.error.credentialsNested':
    'Бул кирүү чекити жогорку деңгээлдеги ишеним грамоталарын окуйт, бирок бул дене аларды {{envelope}} астына жайгаштырат. Бул конвертти ачкан маршрутка loginEndpointти коюңуз же handlers.logIn алдында req.body[ {{envelope}}] ачуу үчүн mapRequest менен createRequestHandlerди колдонуңуз.',
  'user.error.oauthStateMismatch': 'OAuth абалынын дал келбестиги — CSRF чабуулу болушу мүмкүн',
  'user.error.avatarTooLarge': 'Аватар {{max}} же андан аз белгиден турушу керек.',
  'user.error.bioTooLong': 'Өмүр баян {{max}} же андан аз белгиден турушу керек.',
  'user.error.noUpdatableFields': 'Жаңыртыла турган талаалар берилген жок.',
  'user.error.oauthDataInvalid': 'oauthData объект болушу керек.',
  'user.error.subscriptionActivationRequiresVerification':
    'Жазылууну активдештирүү үчүн квитанцияны текшерүү керек — POST /users /:id/verify-payment/:provider колдонуңуз.',
  'user.payment.noBillingAccount':
    'Бул колдонуучу үчүн {{provider}} эсеп-фактура аккаунту табылган жок.',
  'user.payment.portalFailed': '{{provider}} эсеп-кысап порталын ачуу мүмкүн болгон жок.',
  'user.payment.portalNotSupported': '{{provider}} эсеп-кысап порталын сунуштабайт.',
  'user.payment.subscriptionOwnershipMismatch': 'Бул жазылуу сиздин аккаунтуңузга таандык эмес.',
  'user.payment.transactionAlreadyClaimed':
    'Бул сатып алуу мурунтан эле башка аккаунт менен байланышкан.',
}
