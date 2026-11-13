import type { UserTranslations } from './types.js'

/** User translations for Kannada. */
export const kn: UserTranslations = {
  'user.error.badRequest': 'ಕೆಟ್ಟ ವಿನಂತಿ.',
  'user.error.notFound': 'ಕಂಡುಬಂದಿಲ್ಲ.',
  'user.error.failedToCreateSession': 'ಸೆಷನ್ ರಚಿಸಲು ವಿಫಲ.',
  'user.error.usernameRequired': 'ಬಳಕೆದಾರ ಹೆಸರು ಅಗತ್ಯ.',
  'user.error.passwordRequired': 'ಪಾಸ್‌ವರ್ಡ್ ಅಗತ್ಯ.',
  'user.error.emailInvalid': 'ಇಮೇಲ್ ಅಮಾನ್ಯ.',
  'user.error.usernameUnavailable': 'ಬಳಕೆದಾರ ಹೆಸರು ಲಭ್ಯವಿಲ್ಲ.',
  'user.error.emailAlreadyRegistered': 'ಇಮೇಲ್ ಈಗಾಗಲೇ ನೋಂದಾಯಿಸಲಾಗಿದೆ.',
  'user.error.failedToHashPassword': 'ಪಾಸ್‌ವರ್ಡ್ ಹ್ಯಾಶ್ ಮಾಡಲು ವಿಫಲ.',
  'user.error.invalidCredentials': 'ಅಮಾನ್ಯ ರುಜುವಾತುಗಳು.',
  'user.error.invalidTwoFactorToken': 'ಅಮಾನ್ಯ ಎರಡು-ಅಂಶ ಟೋಕನ್.',
  'user.error.twoFactorVerificationUnavailable': 'ಎರಡು-ಅಂಶ ಪರಿಶೀಲನೆ ಲಭ್ಯವಿಲ್ಲ.',
  'user.error.loginFailed': 'ಲಾಗಿನ್ ವಿಫಲ.',
  'user.notification.newLogin': 'ಹೊಸ ಲಾಗಿನ್',
  'user.notification.newLoginBody': '{{deviceName}} ಯಿಂದ ಹೊಸ ಲಾಗಿನ್.',
  'user.error.usernameCannotBeEmpty': 'ಬಳಕೆದಾರ ಹೆಸರು ಖಾಲಿ ಇರಬಾರದು.',
  'user.error.usernameInvalid':
    'ಬಳಕೆದಾರ ಹೆಸರಿನಲ್ಲಿ ಅಕ್ಷರಗಳು, ಸಂಖ್ಯೆಗಳು, ಚುಕ್ಕೆಗಳು, ಹೈಫನ್‌ಗಳು ಮತ್ತು ಅಂಡರ್‌ಸ್ಕೋರ್‌ಗಳು ಮಾತ್ರ ಇರಬಹುದು.',
  'user.error.bodyNestedUnderUser':
    'ಈ ವಿನಂತಿಯು ತನ್ನ ಕ್ಷೇತ್ರಗಳನ್ನು "user" ಒಳಗೆ ಇರಿಸುತ್ತದೆ; ಬಳಕೆದಾರ ಹೆಸರು, ಇಮೇಲ್ ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್ ಅನ್ನು ಮೇಲಿನ ಮಟ್ಟದಲ್ಲಿ ಕಳುಹಿಸಿ.',
  'user.error.failedToUpdateUser': 'ಬಳಕೆದಾರರನ್ನು ನವೀಕರಿಸಲು ವಿಫಲ.',
  'user.error.failedToDeleteUser': 'ಬಳಕೆದಾರರನ್ನು ಅಳಿಸಲು ವಿಫಲ.',
  'user.error.failedToReadUser': 'ಬಳಕೆದಾರರನ್ನು ಓದಲು ವಿಫಲ.',
  'user.error.emailRequired': 'ಇಮೇಲ್ ಅಗತ್ಯ.',
  'user.email.passwordResetSubject': '{{appName}} - ಪಾಸ್‌ವರ್ಡ್ ರೀಸೆಟ್',
  'user.email.passwordResetText': 'ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ರೀಸೆಟ್ ಟೋಕನ್: {{token}}',
  'user.email.passwordResetLink': 'ಇಲ್ಲಿ ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ರೀಸೆಟ್ ಮಾಡಿ: {{url}}',
  'user.email.passwordResetHtml':
    '<p>ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ರೀಸೆಟ್ ಟೋಕನ್: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ರೀಸೆಟ್ ಮಾಡಿ</a></p>',
  'user.error.failedToProcessPasswordReset': 'ಪಾಸ್‌ವರ್ಡ್ ರೀಸೆಟ್ ಪ್ರಕ್ರಿಯೆ ವಿಫಲ.',
  'user.error.newPasswordRequired': 'ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಅಗತ್ಯ.',
  'user.error.currentPasswordRequired': 'ಪ್ರಸ್ತುತ ಪಾಸ್‌ವರ್ಡ್ ಅಗತ್ಯ.',
  'user.error.currentPasswordIncorrect': 'ಪ್ರಸ್ತುತ ಪಾಸ್‌ವರ್ಡ್ ತಪ್ಪಾಗಿದೆ.',
  'user.error.failedToUpdatePassword': 'ಪಾಸ್‌ವರ್ಡ್ ನವೀಕರಿಸಲು ವಿಫಲ.',
  'user.error.planKeyRequired': 'planKey ಅಗತ್ಯ.',
  'user.error.invalidPlan': 'ಅಮಾನ್ಯ ಯೋಜನೆ.',
  'user.error.failedToUpdateSubscription': 'ಚಂದಾ ನವೀಕರಿಸಲು ವಿಫಲ.',
  'user.error.failedToUpdatePlan': 'ಯೋಜನೆ ನವೀಕರಿಸಲು ವಿಫಲ.',
  'user.error.twoFactorNotAvailable': 'ಎರಡು-ಅಂಶ ದೃಢೀಕರಣ ಲಭ್ಯವಿಲ್ಲ.',
  'user.error.twoFactorRequiresPassword':
    'ಈ ಖಾತೆಯಲ್ಲಿ ಎರಡು-ಅಂಶ ದೃಢೀಕರಣ ಸಕ್ರಿಯವಾಗಿದೆ. ಮುಂದುವರಿಯಲು ನಿಮ್ಮ ಇಮೇಲ್ ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್‌ನೊಂದಿಗೆ ಸೈನ್ ಇನ್ ಮಾಡಿ.',
  'user.error.tokenRequired': 'ಟೋಕನ್ ಅಗತ್ಯ.',
  'user.error.noPendingTwoFactorSetup':
    'ಬಾಕಿ ಎರಡು-ಅಂಶ ಸೆಟಪ್ ಇಲ್ಲ. ಮೊದಲು "setup" ಕ್ರಿಯೆಯೊಂದಿಗೆ ಕರೆ ಮಾಡಿ.',
  'user.error.invalidToken': 'ಅಮಾನ್ಯ ಟೋಕನ್.',
  'user.error.twoFactorRequired': 'ಎರಡು-ಅಂಶ ಕೋಡ್ ಅಗತ್ಯ.',
  'user.error.twoFactorNotEnabled': 'ಎರಡು-ಅಂಶ ಸಕ್ರಿಯಗೊಂಡಿಲ್ಲ.',
  'user.error.invalidAction': 'ಅಮಾನ್ಯ ಕ್ರಿಯೆ. "setup", "enable", ಅಥವಾ "disable" ಬಳಸಿ.',
  'user.error.twoFactorOperationFailed': 'ಎರಡು-ಅಂಶ ಕಾರ್ಯಾಚರಣೆ ವಿಫಲ.',
  'user.error.oauthServerNotConfigured': 'OAuth ಸರ್ವರ್ "{{server}}" ಕಾನ್ಫಿಗರ್ ಆಗಿಲ್ಲ.',
  'user.error.oauthVerificationFailed': 'OAuth ಪರಿಶೀಲನೆ ವಿಫಲ.',
  'user.error.failedToCreateUser': 'ಬಳಕೆದಾರರನ್ನು ರಚಿಸಲು ವಿಫಲ.',
  'user.error.oauthLoginFailed': 'OAuth ಲಾಗಿನ್ ವಿಫಲ.',
  'user.error.unauthorized': 'ಅನಧಿಕೃತ',
  'user.error.passwordTooLong': 'ಪಾಸ್‌ವರ್ಡ್ ಗರಿಷ್ಠ {{max}} ಅಕ್ಷರಗಳನ್ನು ಹೊಂದಿರಬೇಕು.',
  'user.error.passwordTooShort': 'ಪಾಸ್‌ವರ್ಡ್ ಕನಿಷ್ಠ {{min}} ಅಕ್ಷರಗಳನ್ನು ಹೊಂದಿರಬೇಕು.',
  'user.error.tooManyRequests': 'ತುಂಬಾ ಪ್ರಯತ್ನಗಳು. ದಯವಿಟ್ಟು ಕಾಯಿರಿ ಮತ್ತು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  'user.error.webhookUnauthorized': 'ಅನಧಿಕೃತ ಪಾವತಿ ಅಧಿಸೂಚನೆ',
  'user.error.credentialsNested':
    'ಈ ಲಾಗಿನ್ ಎಂಡ್‌ಪಾಯಿಂಟ್ ಉನ್ನತ ಮಟ್ಟದಲ್ಲಿ ರುಜುವಾತುಗಳನ್ನು ಓದುತ್ತದೆ, ಆದರೆ ಈ ದೇಹವು ಅವುಗಳನ್ನು {{envelope}} ಅಡಿಯಲ್ಲಿ ಇರಿಸುತ್ತದೆ. ಈ ಎನ್ವೆಲಪ್ ಅನ್ನು ಅನ್‌ವ್ರಾಪ್ ಮಾಡುವ ಮಾರ್ಗಕ್ಕೆ ಲಾಗಿನ್‌ಎಂಡ್‌ಪಾಯಿಂಟ್ ಅನ್ನು ಹೊಂದಿಸಿ, ಅಥವಾ handlers.logIn ಮೊದಲು req.body[ {{envelope}}] ಅನ್ನು ಅನ್‌ವ್ರಾಪ್ ಮಾಡಲು mapRequest ನೊಂದಿಗೆ createRequestHandler ಅನ್ನು ಬಳಸಿ.',
  'user.error.oauthStateMismatch': 'OAuth ಸ್ಥಿತಿಯ ಹೊಂದಾಣಿಕೆಯಿಲ್ಲ — ಸಂಭಾವ್ಯ CSRF ದಾಳಿ',
  'user.error.avatarTooLarge': 'ಅವತಾರ್ {{max}} ಅಥವಾ ಅದಕ್ಕಿಂತ ಕಡಿಮೆ ಅಕ್ಷರಗಳನ್ನು ಹೊಂದಿರಬೇಕು.',
  'user.error.bioTooLong': 'ಜೀವನ ಚರಿತ್ರೆಯು {{max}} ಅಥವಾ ಅದಕ್ಕಿಂತ ಕಡಿಮೆ ಅಕ್ಷರಗಳನ್ನು ಹೊಂದಿರಬೇಕು.',
  'user.error.noUpdatableFields': 'ನವೀಕರಿಸಬಹುದಾದ ಯಾವುದೇ ಕ್ಷೇತ್ರಗಳನ್ನು ಒದಗಿಸಲಾಗಿಲ್ಲ.',
  'user.error.oauthDataInvalid': 'oauthData ಒಂದು ವಸ್ತುವಾಗಿರಬೇಕು.',
  'user.error.subscriptionActivationRequiresVerification':
    'ಚಂದಾದಾರಿಕೆ ಸಕ್ರಿಯಗೊಳಿಸುವಿಕೆಯು ರಶೀದಿ ಪರಿಶೀಲನೆಯ ಮೂಲಕ ಹೋಗಬೇಕು — POST /users /:id/verify-payment/:provider ಅನ್ನು ಬಳಸಿ.',
  'user.payment.noBillingAccount': 'ಈ ಬಳಕೆದಾರರಿಗೆ ಯಾವುದೇ {{provider}} ಬಿಲ್ಲಿಂಗ್ ಖಾತೆ ಕಂಡುಬಂದಿಲ್ಲ.',
  'user.payment.portalFailed': '{{provider}} ಬಿಲ್ಲಿಂಗ್ ಪೋರ್ಟಲ್ ತೆರೆಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
  'user.payment.portalNotSupported': '{{provider}} ಬಿಲ್ಲಿಂಗ್ ಪೋರ್ಟಲ್ ಅನ್ನು ನೀಡುವುದಿಲ್ಲ.',
  'user.payment.subscriptionOwnershipMismatch': 'ಈ ಚಂದಾದಾರಿಕೆ ನಿಮ್ಮ ಖಾತೆಗೆ ಸೇರಿಲ್ಲ.',
  'user.payment.transactionAlreadyClaimed': 'ಈ ಖರೀದಿಯು ಈಗಾಗಲೇ ಮತ್ತೊಂದು ಖಾತೆಯೊಂದಿಗೆ ಸಂಯೋಜಿತವಾಗಿದೆ.',
  'user.error.completeTargetMissing':
    'completeId ಎಂದು ಒದಗಿಸಲಾದ ಐಡಿಯೊಂದಿಗೆ ಯಾವುದೇ ಖಾತೆ ಅಸ್ತಿತ್ವದಲ್ಲಿಲ್ಲ.',
  'user.error.completeIdentityMismatch':
    'ಒದಗಿಸಲಾದ ಬಳಕೆದಾರಹೆಸರು ಅಥವಾ ಇಮೇಲ್ ಸಂಪೂರ್ಣ ಐಡಿ ಖಾತೆಯನ್ನು ಗುರುತಿಸುವುದಿಲ್ಲ.',
  'user.error.completeNotOwned':
    'ಕಂಪ್ಲೀಟ್ ಐಡಿ ಖಾತೆಯು OAuth ಮೂಲಕ ಸೈನ್ ಇನ್ ಆಗುತ್ತದೆ; ಅದರ ರುಜುವಾತುಗಳನ್ನು ಇಲ್ಲಿ ಒದಗಿಸಲಾಗಿಲ್ಲ.',
  'user.error.identityRequired': 'ಖಾತೆಯನ್ನು ಗುರುತಿಸಲು ಪೂರೈಕೆಗೆ ಬಳಕೆದಾರಹೆಸರು ಅಥವಾ ಇಮೇಲ್ ಅಗತ್ಯವಿದೆ.',
  'user.error.usernameEmailConflict':
    'ಬಳಕೆದಾರಹೆಸರು ಮತ್ತು ಇಮೇಲ್ ಎರಡು ವಿಭಿನ್ನ ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ ಖಾತೆಗಳಿಗೆ ಸೇರಿವೆ.',
  'user.error.oauthEmailCollision':
    'ಈ ಇಮೇಲ್‌ಗಾಗಿ ಈಗಾಗಲೇ ಒಂದು ಖಾತೆ ಅಸ್ತಿತ್ವದಲ್ಲಿದೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಮೂಲ ವಿಧಾನದೊಂದಿಗೆ ಸೈನ್ ಇನ್ ಮಾಡಿ, ನಂತರ ನಿಮ್ಮ ಖಾತೆ ಸೆಟ್ಟಿಂಗ್‌ಗಳಿಂದ ಈ ಪೂರೈಕೆದಾರರನ್ನು ಲಿಂಕ್ ಮಾಡಿ.',
}
