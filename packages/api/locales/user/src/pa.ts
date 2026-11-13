import type { UserTranslations } from './types.js'

/** User translations for Punjabi. */
export const pa: UserTranslations = {
  'user.error.badRequest': 'ਖ਼ਰਾਬ ਬੇਨਤੀ।',
  'user.error.notFound': 'ਨਹੀਂ ਮਿਲਿਆ।',
  'user.error.failedToCreateSession': 'ਸੈਸ਼ਨ ਬਣਾਉਣ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.usernameRequired': 'ਉਪਭੋਗਤਾ ਨਾਮ ਲੋੜੀਂਦਾ ਹੈ।',
  'user.error.passwordRequired': 'ਪਾਸਵਰਡ ਲੋੜੀਂਦਾ ਹੈ।',
  'user.error.emailInvalid': 'ਈਮੇਲ ਅਵੈਧ ਹੈ।',
  'user.error.usernameUnavailable': 'ਉਪਭੋਗਤਾ ਨਾਮ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।',
  'user.error.emailAlreadyRegistered': 'ਈਮੇਲ ਪਹਿਲਾਂ ਤੋਂ ਰਜਿਸਟਰ ਹੈ।',
  'user.error.failedToHashPassword': 'ਪਾਸਵਰਡ ਹੈਸ਼ ਕਰਨ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.invalidCredentials': 'ਅਵੈਧ ਪ੍ਰਮਾਣ ਪੱਤਰ।',
  'user.error.invalidTwoFactorToken': 'ਅਵੈਧ ਦੋ-ਕਾਰਕ ਟੋਕਨ।',
  'user.error.twoFactorVerificationUnavailable': 'ਦੋ-ਕਾਰਕ ਤਸਦੀਕ ਉਪਲਬਧ ਨਹੀਂ।',
  'user.error.loginFailed': 'ਲੌਗਇਨ ਅਸਫਲ।',
  'user.notification.newLogin': 'ਨਵਾਂ ਲੌਗਇਨ',
  'user.notification.newLoginBody': '{{deviceName}} ਤੋਂ ਨਵਾਂ ਲੌਗਇਨ।',
  'user.error.usernameCannotBeEmpty': 'ਉਪਭੋਗਤਾ ਨਾਮ ਖਾਲੀ ਨਹੀਂ ਹੋ ਸਕਦਾ।',
  'user.error.usernameInvalid':
    'ਯੂਜ਼ਰਨੇਮ ਵਿੱਚ ਸਿਰਫ਼ ਅੱਖਰ, ਅੰਕ, ਬਿੰਦੂ, ਹਾਈਫ਼ਨ ਅਤੇ ਅੰਡਰਸਕੋਰ ਹੋ ਸਕਦੇ ਹਨ।',
  'user.error.bodyNestedUnderUser':
    'ਇਹ ਬੇਨਤੀ ਆਪਣੇ ਖੇਤਰ "user" ਹੇਠਾਂ ਰੱਖਦੀ ਹੈ; ਯੂਜ਼ਰਨੇਮ, ਈਮੇਲ ਅਤੇ ਪਾਸਵਰਡ ਸਿਖਰਲੇ ਪੱਧਰ ਤੇ ਭੇਜੋ।',
  'user.error.failedToUpdateUser': 'ਉਪਭੋਗਤਾ ਅੱਪਡੇਟ ਕਰਨ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.failedToDeleteUser': 'ਉਪਭੋਗਤਾ ਮਿਟਾਉਣ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.failedToReadUser': 'ਉਪਭੋਗਤਾ ਪੜ੍ਹਨ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.emailRequired': 'ਈਮੇਲ ਲੋੜੀਂਦੀ ਹੈ।',
  'user.email.passwordResetSubject': '{{appName}} - ਪਾਸਵਰਡ ਰੀਸੈੱਟ',
  'user.email.passwordResetText': 'ਤੁਹਾਡਾ ਪਾਸਵਰਡ ਰੀਸੈੱਟ ਟੋਕਨ: {{token}}',
  'user.email.passwordResetLink': 'ਇੱਥੇ ਆਪਣਾ ਪਾਸਵਰਡ ਰੀਸੈੱਟ ਕਰੋ: {{url}}',
  'user.email.passwordResetHtml': '<p>ਤੁਹਾਡਾ ਪਾਸਵਰਡ ਰੀਸੈੱਟ ਟੋਕਨ: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">ਆਪਣਾ ਪਾਸਵਰਡ ਰੀਸੈੱਟ ਕਰੋ</a></p>',
  'user.error.failedToProcessPasswordReset': 'ਪਾਸਵਰਡ ਰੀਸੈੱਟ ਪ੍ਰਕਿਰਿਆ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.newPasswordRequired': 'ਨਵਾਂ ਪਾਸਵਰਡ ਲੋੜੀਂਦਾ ਹੈ।',
  'user.error.currentPasswordRequired': 'ਮੌਜੂਦਾ ਪਾਸਵਰਡ ਲੋੜੀਂਦਾ ਹੈ।',
  'user.error.currentPasswordIncorrect': 'ਮੌਜੂਦਾ ਪਾਸਵਰਡ ਗ਼ਲਤ ਹੈ।',
  'user.error.failedToUpdatePassword': 'ਪਾਸਵਰਡ ਅੱਪਡੇਟ ਕਰਨ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.planKeyRequired': 'planKey ਲੋੜੀਂਦਾ ਹੈ।',
  'user.error.invalidPlan': 'ਅਵੈਧ ਯੋਜਨਾ।',
  'user.error.failedToUpdateSubscription': 'ਸਬਸਕ੍ਰਿਪਸ਼ਨ ਅੱਪਡੇਟ ਕਰਨ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.failedToUpdatePlan': 'ਯੋਜਨਾ ਅੱਪਡੇਟ ਕਰਨ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.twoFactorNotAvailable': 'ਦੋ-ਕਾਰਕ ਪ੍ਰਮਾਣੀਕਰਨ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।',
  'user.error.twoFactorRequiresPassword':
    'ਇਸ ਖਾਤੇ ਉੱਤੇ ਦੋ-ਕਾਰਕ ਪ੍ਰਮਾਣੀਕਰਨ ਸਮਰੱਥ ਹੈ। ਜਾਰੀ ਰੱਖਣ ਲਈ ਆਪਣੀ ਈਮੇਲ ਅਤੇ ਪਾਸਵਰਡ ਨਾਲ ਸਾਈਨ ਇਨ ਕਰੋ।',
  'user.error.tokenRequired': 'ਟੋਕਨ ਲੋੜੀਂਦਾ ਹੈ।',
  'user.error.noPendingTwoFactorSetup':
    'ਕੋਈ ਬਕਾਇਆ ਦੋ-ਕਾਰਕ ਸੈੱਟਅੱਪ ਨਹੀਂ। ਪਹਿਲਾਂ "setup" ਐਕਸ਼ਨ ਨਾਲ ਕਾਲ ਕਰੋ।',
  'user.error.invalidToken': 'ਅਵੈਧ ਟੋਕਨ।',
  'user.error.twoFactorRequired': 'ਦੋ-ਕਾਰਕ ਕੋਡ ਲੋੜੀਂਦਾ ਹੈ।',
  'user.error.twoFactorNotEnabled': 'ਦੋ-ਕਾਰਕ ਸਕਿਰਿਆ ਨਹੀਂ ਹੈ।',
  'user.error.invalidAction': 'ਅਵੈਧ ਐਕਸ਼ਨ। "setup", "enable", ਜਾਂ "disable" ਵਰਤੋ।',
  'user.error.twoFactorOperationFailed': 'ਦੋ-ਕਾਰਕ ਕਾਰਵਾਈ ਅਸਫਲ।',
  'user.error.oauthServerNotConfigured': 'OAuth ਸਰਵਰ "{{server}}" ਕੌਂਫਿਗਰ ਨਹੀਂ ਹੈ।',
  'user.error.oauthVerificationFailed': 'OAuth ਤਸਦੀਕ ਅਸਫਲ।',
  'user.error.failedToCreateUser': 'ਉਪਭੋਗਤਾ ਬਣਾਉਣ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.oauthLoginFailed': 'OAuth ਲੌਗਇਨ ਅਸਫਲ।',
  'user.error.unauthorized': 'ਅਣਅਧਿਕਾਰਤ',
  'user.error.passwordTooLong': 'ਪਾਸਵਰਡ ਵੱਧ ਤੋਂ ਵੱਧ {{max}} ਅੱਖਰਾਂ ਦਾ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ।',
  'user.error.passwordTooShort': 'ਪਾਸਵਰਡ ਘੱਟੋ-ਘੱਟ {{min}} ਅੱਖਰਾਂ ਦਾ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ।',
  'user.error.tooManyRequests':
    'ਬਹੁਤ ਜ਼ਿਆਦਾ ਕੋਸ਼ਿਸ਼ਾਂ। ਕਿਰਪਾ ਕਰਕੇ ਉਡੀਕ ਕਰੋ ਅਤੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  'user.error.webhookUnauthorized': 'ਅਣਅਧਿਕਾਰਤ ਭੁਗਤਾਨ ਸੂਚਨਾ',
  'user.error.credentialsNested':
    "ਇਹ ਲਾਗਇਨ ਐਂਡਪੁਆਇੰਟ ਸਿਖਰਲੇ ਪੱਧਰ 'ਤੇ ਪ੍ਰਮਾਣ ਪੱਤਰ ਪੜ੍ਹਦਾ ਹੈ, ਪਰ ਇਹ ਬਾਡੀ ਉਹਨਾਂ ਨੂੰ {{envelope}} ਦੇ ਹੇਠਾਂ ਰੱਖਦਾ ਹੈ। loginEndpoint ਨੂੰ ਉਸ ਰੂਟ 'ਤੇ ਸੈੱਟ ਕਰੋ ਜੋ ਇਸ ਲਿਫਾਫੇ ਨੂੰ ਖੋਲ੍ਹਦਾ ਹੈ, ਜਾਂ handlers.logIn ਤੋਂ ਪਹਿਲਾਂ req.body[ {{envelope}}] ਨੂੰ ਖੋਲ੍ਹਣ ਲਈ mapRequest ਨਾਲ createRequestHandler ਦੀ ਵਰਤੋਂ ਕਰੋ।",
  'user.error.oauthStateMismatch': 'OAuth ਸਥਿਤੀ ਮੇਲ ਨਹੀਂ ਖਾਂਦੀ — ਸੰਭਵ CSRF ਹਮਲਾ',
  'user.error.avatarTooLarge': 'ਅਵਤਾਰ {{max}} ਅੱਖਰਾਂ ਜਾਂ ਘੱਟ ਦਾ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ।',
  'user.error.bioTooLong': 'ਬਾਇਓ {{max}} ਅੱਖਰਾਂ ਜਾਂ ਘੱਟ ਦਾ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ।',
  'user.error.noUpdatableFields': 'ਕੋਈ ਅੱਪਡੇਟ ਕਰਨ ਯੋਗ ਖੇਤਰ ਪ੍ਰਦਾਨ ਨਹੀਂ ਕੀਤੇ ਗਏ ਸਨ।',
  'user.error.oauthDataInvalid': 'oauthData ਇੱਕ ਵਸਤੂ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।',
  'user.error.subscriptionActivationRequiresVerification':
    'ਸਬਸਕ੍ਰਿਪਸ਼ਨ ਐਕਟੀਵੇਸ਼ਨ ਰਸੀਦ ਤਸਦੀਕ ਵਿੱਚੋਂ ਲੰਘਣੀ ਚਾਹੀਦੀ ਹੈ — POST /users /:id/verify-payment/:provider ਦੀ ਵਰਤੋਂ ਕਰੋ।',
  'user.payment.noBillingAccount': 'ਇਸ ਵਰਤੋਂਕਾਰ ਲਈ ਕੋਈ {{provider}} ਬਿਲਿੰਗ ਖਾਤਾ ਨਹੀਂ ਮਿਲਿਆ।',
  'user.payment.portalFailed': '{{provider}} ਬਿਲਿੰਗ ਪੋਰਟਲ ਖੋਲ੍ਹਿਆ ਨਹੀਂ ਜਾ ਸਕਿਆ।',
  'user.payment.portalNotSupported': '{{provider}} ਬਿਲਿੰਗ ਪੋਰਟਲ ਦੀ ਪੇਸ਼ਕਸ਼ ਨਹੀਂ ਕਰਦਾ।',
  'user.payment.subscriptionOwnershipMismatch': 'ਇਹ ਗਾਹਕੀ ਤੁਹਾਡੇ ਖਾਤੇ ਨਾਲ ਸਬੰਧਤ ਨਹੀਂ ਹੈ।',
  'user.payment.transactionAlreadyClaimed': 'ਇਹ ਖਰੀਦ ਪਹਿਲਾਂ ਹੀ ਕਿਸੇ ਹੋਰ ਖਾਤੇ ਨਾਲ ਜੁੜੀ ਹੋਈ ਹੈ।',
  'user.error.completeTargetMissing':
    "ਪੂਰਾ ਆਈਡੀ ਦੇ ਤੌਰ 'ਤੇ ਦਿੱਤੀ ਗਈ ਆਈਡੀ ਵਾਲਾ ਕੋਈ ਖਾਤਾ ਮੌਜੂਦ ਨਹੀਂ ਹੈ।",
  'user.error.completeIdentityMismatch':
    'ਦਿੱਤਾ ਗਿਆ ਯੂਜ਼ਰਨੇਮ ਜਾਂ ਈਮੇਲ ਪੂਰਾ ਆਈਡੀ ਖਾਤੇ ਦੀ ਪਛਾਣ ਨਹੀਂ ਕਰਦਾ।',
  'user.error.completeNotOwned':
    'completeId ਖਾਤਾ OAuth ਰਾਹੀਂ ਸਾਈਨ ਇਨ ਕਰਦਾ ਹੈ; ਇਸਦੇ ਪ੍ਰਮਾਣ ਪੱਤਰ ਇੱਥੇ ਪ੍ਰਦਾਨ ਨਹੀਂ ਕੀਤੇ ਗਏ ਹਨ।',
  'user.error.identityRequired':
    'ਪ੍ਰੋਵਿਜ਼ਨਿੰਗ ਨੂੰ ਖਾਤੇ ਦੀ ਪਛਾਣ ਕਰਨ ਲਈ ਇੱਕ ਉਪਭੋਗਤਾ ਨਾਮ ਜਾਂ ਈਮੇਲ ਦੀ ਲੋੜ ਹੁੰਦੀ ਹੈ।',
  'user.error.usernameEmailConflict': 'ਯੂਜ਼ਰਨੇਮ ਅਤੇ ਈਮੇਲ ਦੋ ਵੱਖ-ਵੱਖ ਮੌਜੂਦਾ ਖਾਤਿਆਂ ਨਾਲ ਸਬੰਧਤ ਹਨ।',
  'user.error.oauthEmailCollision':
    'ਇਸ ਈਮੇਲ ਲਈ ਪਹਿਲਾਂ ਹੀ ਇੱਕ ਖਾਤਾ ਮੌਜੂਦ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਮੂਲ ਢੰਗ ਨਾਲ ਸਾਈਨ ਇਨ ਕਰੋ, ਫਿਰ ਆਪਣੀਆਂ ਖਾਤਾ ਸੈਟਿੰਗਾਂ ਤੋਂ ਇਸ ਪ੍ਰਦਾਤਾ ਨੂੰ ਲਿੰਕ ਕਰੋ।',
}
