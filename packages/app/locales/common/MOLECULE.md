# @molecule/app-locales-common

Common UI translations bond — re-exports the canonical `common.*` keys
(close / continue / goBack / loading / saving / submit) for all
supported molecule.dev languages.

## Purpose

Provides translations for the `@molecule/app-common` package which has 178 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import { af, am, ar } from '@molecule/app-locales-common'
import type { CommonTranslations, UiTranslations } from '@molecule/app-locales-common'
```

## Translation Keys

| Key | English |
|-----|---------|
| `common.close` | Close |
| `common.continue` | Continue |
| `common.goBack` | Go back |
| `common.loading` | Loading... |
| `common.saving` | Saving... |
| `common.submit` | Submit |
| `auth.error.loginFailed` | Login failed |
| `auth.error.noRefreshToken` | No refresh token available |
| `auth.error.registrationFailed` | Registration failed |
| `auth.error.requestFailed` | Request failed |
| `auth.forgotPassword.email` | Email |
| `auth.forgotPassword.submitting` | Submitting... |
| `auth.forgotPassword.success` | If an account with that email exists, a password reset link has been sent. |
| `auth.login.email` | Email |
| `auth.login.forgotPassword` | Forgot password? |
| `auth.login.logIn` | Log in |
| `auth.login.loggingIn` | Logging in... |
| `auth.login.password` | Password |
| `auth.login.signUp` | Sign up |
| `auth.login.twoFactor` | Two-Factor Token (If enabled) |
| `auth.resetPassword.email` | Email |
| `auth.resetPassword.loggingIn` | Logging in... |
| `auth.resetPassword.newPassword` | Enter New Password |
| `auth.resetPassword.submit` | Set password & log in |
| `auth.resetPassword.token` | Password Reset Token |
| `auth.resetPassword.twoFactor` | Two-Factor Token (If enabled) |
| `auth.signup.email` | Email (Required) |
| `auth.signup.name` | Your name |
| `auth.signup.password` | Password (Required) |
| `auth.signup.signUp` | Sign up |
| `auth.signup.signingUp` | Signing up... |
| `codeSandbox.docker.error.apiError` | Docker API {{method}} {{path}}: {{status}} {{error}} |
| `codeSandbox.docker.error.deleteFailed` | Failed to delete {{path}}: {{error}} |
| `codeSandbox.docker.error.readFailed` | Failed to read {{path}}: {{error}} |
| `codeSandbox.docker.error.writeFailed` | Failed to write {{path}}: {{error}} |
| `conversation.error.aiNotConfigured` | AI provider not configured |
| `conversation.error.messageRequired` | message is required |
| `conversation.error.notFound` | No conversation found |
| `conversation.error.streamError` | AI streaming error |
| `conversation.error.unknownAiError` | Unknown AI error |
| `device.error.badRequest` | Bad request. |
| `device.error.notFound` | Not found. |
| `device.error.unauthorized` | Unauthorized. |
| `error.forbidden` | Access denied. |
| `error.networkError` | Network error. Please check your connection. |
| `error.notFound` | Resource not found. |
| `error.serverError` | Server error. Please try again later. |
| `error.timeout` | Request timed out. Please try again. |
| `error.unauthorized` | You are not authorized to perform this action. |
| `error.unknown` | An unexpected error occurred. |
| `error.validationError` | Please check your input and try again. |
| `footer.about` | About {{appName}} |
| `footer.language` | Language |
| `footer.privacyPolicy` | Privacy Policy |
| `footer.termsOfService` | Terms of Service |
| `forms.invalidEmail` | Invalid email address |
| `forms.invalidFormat` | Invalid format |
| `forms.invalidUrl` | Invalid URL |
| `forms.invalidValue` | Invalid value |
| `forms.max` | Value must be at most {{max}} |
| `forms.maxLength` | Must be at most {{maxLength}} characters |
| `forms.min` | Value must be at least {{min}} |
| `forms.minLength` | Must be at least {{minLength}} characters |
| `forms.required` | This field is required |
| `home.greeting` | Hello,  |
| `home.world` | World |
| `http.error.networkError` | Network error. |
| `http.error.requestFailed` | Request failed with status {{status}}. |
| `oauth.continueWith` | Continue with {{provider}} |
| `oauth.github` | GitHub |
| `oauth.gitlab` | GitLab |
| `oauth.google` | Google |
| `oauth.orContinueWith` | Or continue with |
| `oauth.twitter` | Twitter |
| `planUpdated.message` | Your plan has been updated. |
| `planUpdated.returnHome` | Return home |
| `planUpdated.thankYou` | Thank you! |
| `project.error.nameAndTypeRequired` | name and projectType are required |
| `project.error.notFound` | Not found |
| `push.error.notSupported` | Push notifications not supported |
| `push.error.permissionNotGranted` | Notification permission not granted |
| `pwa.update` | Update |
| `pwa.updateAvailable` | New version available! |
| `pwa.updating` | Updating... |
| `resource.error.badRequest` | Bad request. |
| `resource.error.notFound` | Not found. |
| `resource.error.unableToCreate` | Unable to create {{name}}. |
| `resource.error.unableToDelete` | Unable to delete {{name}}. |
| `resource.error.unableToUpdate` | Unable to update {{name}}. |
| `resource.error.unauthorized` | Unauthorized. |
| `resource.error.unknownError` | Unknown error. |
| `routing.error.missingParam` | Missing param  |
| `routing.error.routeNotFound` | Route  |
| `routing.error.useMoleculeRouterOutsideProvider` | useMoleculeRouter must be used within a MoleculeRouterProvider |
| `settings.account` | Account |
| `settings.authentication` | Authentication |
| `settings.billing` | Billing |
| `settings.browser` | Browser |
| `settings.changePassword` | Change password |
| `settings.changePasswordModal.changing` | Changing... |
| `settings.changePasswordModal.currentPassword` | Current Password |
| `settings.changePasswordModal.error` | Failed to change password. |
| `settings.changePasswordModal.newPassword` | New Password |
| `settings.changePasswordModal.submit` | Change password |
| `settings.changePasswordModal.title` | Change Password |
| `settings.deleteAccount` | Delete account |
| `settings.deleteAccountModal.deleting` | Deleting... |
| `settings.deleteAccountModal.password` | Password |
| `settings.deleteAccountModal.submit` | Delete account |
| `settings.deleteAccountModal.title` | Delete Account |
| `settings.deleteAccountModal.warning` | This action cannot be undone. Please enter your password to confirm. |
| `settings.devices` | Devices |
| `settings.email` | Email |
| `settings.failedToDeleteAccount` | Failed to delete account. |
| `settings.failedToUpdateEmail` | Failed to update email. |
| `settings.logOut` | Log out |
| `settings.network` | Network |
| `settings.noDevices` | No devices found |
| `settings.notifications` | Notifications |
| `settings.offline` | Offline |
| `settings.online` | Online |
| `settings.plan` | Plan:  |
| `settings.platform` | Platform |
| `settings.pushNotifications` | Push notifications |
| `settings.thisDevice` | This Device |
| `settings.togglePushNotifications` | Toggle push notifications |
| `settings.toggleTwoFactor` | Toggle two-factor authentication |
| `settings.twoFactor` | Two-factor authentication |
| `settings.unknown` | Unknown |
| `settings.upgrade` | Upgrade |
| `theme.toggle` | Toggle theme |
| `user.error.badRequest` | Bad request. |
| `user.error.currentPasswordIncorrect` | Current password is incorrect. |
| `user.error.currentPasswordRequired` | Current password is required. |
| `user.error.emailAlreadyRegistered` | Email is already registered. |
| `user.error.emailInvalid` | Email is invalid. |
| `user.error.emailRequired` | Email is required. |
| `user.error.failedToCreateSession` | Failed to create session. |
| `user.error.failedToCreateUser` | Failed to create user. |
| `user.error.failedToDeleteUser` | Failed to delete user. |
| `user.error.failedToHashPassword` | Failed to hash password. |
| `user.error.failedToProcessPasswordReset` | Failed to process password reset. |
| `user.error.failedToReadUser` | Failed to read user. |
| `user.error.failedToUpdatePassword` | Failed to update password. |
| `user.error.failedToUpdatePlan` | Failed to update plan. |
| `user.error.failedToUpdateSubscription` | Failed to update subscription. |
| `user.error.failedToUpdateUser` | Failed to update user. |
| `user.error.invalidAction` | Invalid action. Use  |
| `user.error.invalidCredentials` | Invalid credentials. |
| `user.error.invalidPlan` | Invalid plan. |
| `user.error.invalidToken` | Invalid token. |
| `user.error.invalidTwoFactorToken` | Invalid two-factor token. |
| `user.error.loginFailed` | Login failed. |
| `user.error.newPasswordRequired` | New password is required. |
| `user.error.noPendingTwoFactorSetup` | No pending two-factor setup. Call with action  |
| `user.error.notFound` | Not found. |
| `user.error.oauthLoginFailed` | OAuth login failed. |
| `user.error.oauthServerNotConfigured` | OAuth server  |
| `user.error.oauthVerificationFailed` | OAuth verification failed. |
| `user.error.passwordRequired` | Password is required. |
| `user.error.planKeyRequired` | planKey is required. |
| `user.error.tokenRequired` | Token is required. |
| `user.error.twoFactorNotAvailable` | Two-factor authentication is not available. |
| `user.error.twoFactorNotEnabled` | Two-factor is not enabled. |
| `user.error.twoFactorOperationFailed` | Two-factor operation failed. |
| `user.error.twoFactorVerificationUnavailable` | Two-factor verification unavailable. |
| `user.error.usernameCannotBeEmpty` | Username cannot be empty. |
| `user.error.usernameRequired` | Username is required. |
| `user.error.usernameUnavailable` | Username is unavailable. |
| `user.payment.invalidPlan` | Invalid plan for {{provider}}. |
| `user.payment.invalidWebhookEvent` | Invalid webhook event. |
| `user.payment.providerRequired` | Payment provider is required. |
| `user.payment.receiptAndPlanRequired` | receipt and planKey are required. |
| `user.payment.subscriptionIdRequired` | subscriptionId is required. |
| `user.payment.unknownPlan` | Unknown plan. |
| `user.payment.verificationFailed` | Payment verification failed for {{provider}}. |
| `user.payment.verificationNotConfigured` | Payment verification is not configured for {{provider}}. |
| `userMenu.open` | Open user menu |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** app
- **Translates:** `@molecule/app-common`
