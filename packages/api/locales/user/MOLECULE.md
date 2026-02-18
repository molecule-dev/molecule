# @molecule/api-locales-user

Translations for the user resource package in 79 languages

## Purpose

Provides translations for the `@molecule/api-user` package which has 45 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Usage

```typescript
import { af, am, ar } from '@molecule/api-locales-user'
import type { UserTranslationKey, UserTranslations } from '@molecule/api-locales-user'
```

## Translation Keys

| Key | English |
|-----|---------|
| `user.error.badRequest` | Bad request. |
| `user.error.notFound` | Not found. |
| `user.error.failedToCreateSession` | Failed to create session. |
| `user.error.usernameRequired` | Username is required. |
| `user.error.passwordRequired` | Password is required. |
| `user.error.emailInvalid` | Email is invalid. |
| `user.error.usernameUnavailable` | Username is unavailable. |
| `user.error.emailAlreadyRegistered` | Email is already registered. |
| `user.error.failedToHashPassword` | Failed to hash password. |
| `user.error.invalidCredentials` | Invalid credentials. |
| `user.error.invalidTwoFactorToken` | Invalid two-factor token. |
| `user.error.twoFactorVerificationUnavailable` | Two-factor verification unavailable. |
| `user.error.loginFailed` | Login failed. |
| `user.notification.newLogin` | New Login |
| `user.notification.newLoginBody` | New login from {{deviceName}}. |
| `user.error.usernameCannotBeEmpty` | Username cannot be empty. |
| `user.error.failedToUpdateUser` | Failed to update user. |
| `user.error.failedToDeleteUser` | Failed to delete user. |
| `user.error.failedToReadUser` | Failed to read user. |
| `user.error.emailRequired` | Email is required. |
| `user.email.passwordResetSubject` | {{appName}} - Password Reset |
| `user.email.passwordResetText` | Your password reset token is: {{token}} |
| `user.email.passwordResetLink` | Reset your password at: {{url}} |
| `user.email.passwordResetHtml` | <p>Your password reset token is: <strong>{{token}}</strong></p> |
| `user.email.passwordResetHtmlLink` | <p><a href= |
| `user.error.failedToProcessPasswordReset` | Failed to process password reset. |
| `user.error.newPasswordRequired` | New password is required. |
| `user.error.currentPasswordRequired` | Current password is required. |
| `user.error.currentPasswordIncorrect` | Current password is incorrect. |
| `user.error.failedToUpdatePassword` | Failed to update password. |
| `user.error.planKeyRequired` | planKey is required. |
| `user.error.invalidPlan` | Invalid plan. |
| `user.error.failedToUpdateSubscription` | Failed to update subscription. |
| `user.error.failedToUpdatePlan` | Failed to update plan. |
| `user.error.twoFactorNotAvailable` | Two-factor authentication is not available. |
| `user.error.tokenRequired` | Token is required. |
| `user.error.noPendingTwoFactorSetup` | No pending two-factor setup. Call with action  |
| `user.error.invalidToken` | Invalid token. |
| `user.error.twoFactorNotEnabled` | Two-factor is not enabled. |
| `user.error.invalidAction` | Invalid action. Use  |
| `user.error.twoFactorOperationFailed` | Two-factor operation failed. |
| `user.error.oauthServerNotConfigured` | OAuth server  |
| `user.error.oauthVerificationFailed` | OAuth verification failed. |
| `user.error.failedToCreateUser` | Failed to create user. |
| `user.error.oauthLoginFailed` | OAuth login failed. |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** api
- **Translates:** `@molecule/api-user`
