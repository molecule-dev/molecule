import type { UserTranslations } from './types.js'

/** User translations for Russian. */
export const ru: UserTranslations = {
  'user.error.badRequest': 'Некорректный запрос.',
  'user.error.notFound': 'Не найдено.',
  'user.error.failedToCreateSession': 'Не удалось создать сессию.',
  'user.error.usernameRequired': 'Имя пользователя обязательно.',
  'user.error.passwordRequired': 'Пароль обязателен.',
  'user.error.emailInvalid': 'Электронная почта недействительна.',
  'user.error.usernameUnavailable': 'Имя пользователя недоступно.',
  'user.error.emailAlreadyRegistered': 'Электронная почта уже зарегистрирована.',
  'user.error.failedToHashPassword': 'Не удалось хешировать пароль.',
  'user.error.invalidCredentials': 'Недействительные учётные данные.',
  'user.error.invalidTwoFactorToken': 'Недействительный двухфакторный токен.',
  'user.error.twoFactorVerificationUnavailable': 'Двухфакторная верификация недоступна.',
  'user.error.loginFailed': 'Вход не удался.',
  'user.notification.newLogin': 'Новый вход',
  'user.notification.newLoginBody': 'Новый вход с {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Имя пользователя не может быть пустым.',
  'user.error.usernameInvalid':
    'Имя пользователя может содержать только буквы, цифры, точки, дефисы и подчёркивания.',
  'user.error.bodyNestedUnderUser':
    'Этот запрос вкладывает поля в "user"; отправьте имя пользователя, электронную почту и пароль на верхнем уровне.',
  'user.error.failedToUpdateUser': 'Не удалось обновить пользователя.',
  'user.error.failedToDeleteUser': 'Не удалось удалить пользователя.',
  'user.error.failedToReadUser': 'Не удалось прочитать пользователя.',
  'user.error.emailRequired': 'Электронная почта обязательна.',
  'user.email.passwordResetSubject': '{{appName}} - Сброс пароля',
  'user.email.passwordResetText': 'Ваш токен сброса пароля: {{token}}',
  'user.email.passwordResetLink': 'Сбросьте пароль по адресу: {{url}}',
  'user.email.passwordResetHtml': '<p>Ваш токен сброса пароля: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Сбросить пароль</a></p>',
  'user.error.failedToProcessPasswordReset': 'Не удалось обработать сброс пароля.',
  'user.error.newPasswordRequired': 'Новый пароль обязателен.',
  'user.error.currentPasswordRequired': 'Текущий пароль обязателен.',
  'user.error.currentPasswordIncorrect': 'Текущий пароль неверен.',
  'user.error.failedToUpdatePassword': 'Не удалось обновить пароль.',
  'user.error.planKeyRequired': 'planKey обязателен.',
  'user.error.invalidPlan': 'Недействительный план.',
  'user.error.failedToUpdateSubscription': 'Не удалось обновить подписку.',
  'user.error.failedToUpdatePlan': 'Не удалось обновить план.',
  'user.error.twoFactorNotAvailable': 'Двухфакторная аутентификация недоступна.',
  'user.error.twoFactorRequiresPassword':
    'Двухфакторная аутентификация включена для этой учётной записи. Войдите с помощью электронной почты и пароля, чтобы продолжить.',
  'user.error.tokenRequired': 'Токен обязателен.',
  'user.error.noPendingTwoFactorSetup':
    'Нет ожидающей двухфакторной настройки. Сначала вызовите с действием "setup".',
  'user.error.invalidToken': 'Недействительный токен.',
  'user.error.twoFactorRequired': 'Требуется двухфакторный код.',
  'user.error.twoFactorNotEnabled': 'Двухфакторная аутентификация не включена.',
  'user.error.invalidAction':
    'Недействительное действие. Используйте "setup", "enable" или "disable".',
  'user.error.twoFactorOperationFailed': 'Двухфакторная операция не удалась.',
  'user.error.oauthServerNotConfigured': 'OAuth-сервер "{{server}}" не настроен.',
  'user.error.oauthVerificationFailed': 'Верификация OAuth не удалась.',
  'user.error.failedToCreateUser': 'Не удалось создать пользователя.',
  'user.error.oauthLoginFailed': 'Вход через OAuth не удался.',
  'user.error.unauthorized': 'Несанкционированный доступ',
  'user.error.passwordTooLong': 'Пароль должен содержать не более {{max}} символов',
  'user.error.passwordTooShort': 'Пароль должен содержать не менее {{min}} символов',
  'user.error.tooManyRequests': 'Слишком много попыток. Пожалуйста, подождите и попробуйте снова.',
  'user.error.webhookUnauthorized': 'Уведомление о несанкционированном платеже',
  'user.error.credentialsNested':
    'Этот конечный пункт авторизации считывает учетные данные на верхнем уровне, но тело запроса вкладывается в {{envelope}}. Установите loginEndpoint на маршрут, который распаковывает этот конверт, или используйте createRequestHandler с mapRequest, чтобы распаковать req.body[ {{envelope}}] перед handlers.logIn.',
  'user.error.oauthStateMismatch': 'Несоответствие состояния OAuth — возможная CSRF-атака',
  'user.error.avatarTooLarge': 'Аватар должен содержать не более {{max}} символов.',
  'user.error.bioTooLong': 'В описании профиля должно быть не более {{max}} символов.',
  'user.error.noUpdatableFields': 'Поля, которые можно было бы обновлять, отсутствовали.',
  'user.error.oauthDataInvalid': 'Объект oauthData должен быть объектом.',
  'user.error.subscriptionActivationRequiresVerification':
    'Для активации подписки необходимо пройти проверку квитанции — используйте POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount':
    'Для этого пользователя не найден платежный аккаунт {{provider}} .',
  'user.payment.portalFailed': 'Не удалось открыть платежный портал {{provider}} .',
  'user.payment.portalNotSupported': '{{provider}} не предоставляет портал для выставления счетов.',
  'user.payment.subscriptionOwnershipMismatch': 'Эта подписка не относится к вашему аккаунту.',
  'user.payment.transactionAlreadyClaimed': 'Эта покупка уже связана с другим аккаунтом.',
  'user.error.completeTargetMissing':
    'Учетная запись с указанным идентификатором completeId не существует.',
  'user.error.completeIdentityMismatch':
    'Указанное имя пользователя или адрес электронной почты не идентифицируют учетную запись completeId.',
  'user.error.completeNotOwned':
    'Учетная запись completeId входит в систему через OAuth; ее учетные данные здесь не предоставляются.',
  'user.error.identityRequired':
    'Для идентификации учетной записи при создании учетной записи требуется имя пользователя или адрес электронной почты.',
  'user.error.usernameEmailConflict':
    'Имя пользователя и адрес электронной почты принадлежат двум разным существующим учетным записям.',
  'user.error.oauthEmailCollision':
    'Для этого адреса электронной почты уже существует учетная запись. Пожалуйста, войдите в систему, используя первоначальный способ, а затем свяжите этот почтовый сервис в настройках своей учетной записи.',
}
