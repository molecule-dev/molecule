import type { UserTranslations } from './types.js'

/** User translations for Hungarian. */
export const hu: UserTranslations = {
  'user.error.badRequest': 'Hibás kérés.',
  'user.error.notFound': 'Nem található.',
  'user.error.failedToCreateSession': 'A munkamenet létrehozása sikertelen.',
  'user.error.usernameRequired': 'A felhasználónév megadása kötelező.',
  'user.error.passwordRequired': 'A jelszó megadása kötelező.',
  'user.error.emailInvalid': 'Az e-mail cím érvénytelen.',
  'user.error.usernameUnavailable': 'A felhasználónév nem elérhető.',
  'user.error.emailAlreadyRegistered': 'Az e-mail cím már regisztrálva van.',
  'user.error.failedToHashPassword': 'A jelszó hashelése sikertelen.',
  'user.error.invalidCredentials': 'Érvénytelen hitelesítő adatok.',
  'user.error.invalidTwoFactorToken': 'Érvénytelen kétfaktoros token.',
  'user.error.twoFactorVerificationUnavailable': 'A kétfaktoros ellenőrzés nem elérhető.',
  'user.error.loginFailed': 'A bejelentkezés sikertelen.',
  'user.notification.newLogin': 'Új Bejelentkezés',
  'user.notification.newLoginBody': 'Új bejelentkezés erről: {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'A felhasználónév nem lehet üres.',
  'user.error.usernameInvalid':
    'A felhasználónév csak betűket, számokat, pontokat, kötőjeleket és aláhúzásjeleket tartalmazhat.',
  'user.error.bodyNestedUnderUser':
    'Ez a kéréstörzs a mezőit a "user" alá ágyazza; a felhasználónevet, az e-mailt és a jelszót a legfelső szinten küldje.',
  'user.error.failedToUpdateUser': 'A felhasználó frissítése sikertelen.',
  'user.error.failedToDeleteUser': 'A felhasználó törlése sikertelen.',
  'user.error.failedToReadUser': 'A felhasználó olvasása sikertelen.',
  'user.error.emailRequired': 'Az e-mail cím megadása kötelező.',
  'user.email.passwordResetSubject': '{{appName}} - Jelszó Visszaállítás',
  'user.email.passwordResetText': 'Az Ön jelszó visszaállítási tokenje: {{token}}',
  'user.email.passwordResetLink': 'Állítsa vissza jelszavát itt: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Az Ön jelszó visszaállítási tokenje: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Jelszó visszaállítása</a></p>',
  'user.error.failedToProcessPasswordReset': 'A jelszó visszaállítás feldolgozása sikertelen.',
  'user.error.newPasswordRequired': 'Az új jelszó megadása kötelező.',
  'user.error.currentPasswordRequired': 'A jelenlegi jelszó megadása kötelező.',
  'user.error.currentPasswordIncorrect': 'A jelenlegi jelszó helytelen.',
  'user.error.failedToUpdatePassword': 'A jelszó frissítése sikertelen.',
  'user.error.planKeyRequired': 'A planKey megadása kötelező.',
  'user.error.invalidPlan': 'Érvénytelen csomag.',
  'user.error.failedToUpdateSubscription': 'Az előfizetés frissítése sikertelen.',
  'user.error.failedToUpdatePlan': 'A csomag frissítése sikertelen.',
  'user.error.twoFactorNotAvailable': 'A kétfaktoros hitelesítés nem elérhető.',
  'user.error.twoFactorRequiresPassword':
    'Ezen a fiókon be van kapcsolva a kétfaktoros hitelesítés. A folytatáshoz jelentkezzen be e-mail-címével és jelszavával.',
  'user.error.tokenRequired': 'Token megadása kötelező.',
  'user.error.noPendingTwoFactorSetup':
    'Nincs függőben lévő kétfaktoros beállítás. Hívja meg először a "setup" művelettel.',
  'user.error.invalidToken': 'Érvénytelen token.',
  'user.error.twoFactorRequired': 'Kétfaktoros kód megadása kötelező.',
  'user.error.twoFactorNotEnabled': 'A kétfaktoros hitelesítés nincs engedélyezve.',
  'user.error.invalidAction': 'Érvénytelen művelet. Használja: "setup", "enable" vagy "disable".',
  'user.error.twoFactorOperationFailed': 'A kétfaktoros művelet sikertelen.',
  'user.error.oauthServerNotConfigured': 'Az OAuth szerver "{{server}}" nincs konfigurálva.',
  'user.error.oauthVerificationFailed': 'Az OAuth ellenőrzés sikertelen.',
  'user.error.failedToCreateUser': 'A felhasználó létrehozása sikertelen.',
  'user.error.oauthLoginFailed': 'Az OAuth bejelentkezés sikertelen.',
  'user.error.unauthorized': 'Jogosulatlan',
  'user.error.passwordTooLong': 'A jelszó legfeljebb {{max}} karakterből állhat',
  'user.error.passwordTooShort': 'A jelszónak legalább {{min}} karakterből kell állnia',
  'user.error.tooManyRequests': 'Túl sok próbálkozás. Kérjük, várjon, és próbálja újra.',
  'user.error.webhookUnauthorized': 'Értesítés jogosulatlan fizetésről',
  'user.error.credentialsNested':
    'Ez a bejelentkezési végpont a legfelső szinten olvassa a hitelesítő adatokat, de ez a törzs {{envelope}} alá ágyazza be őket. Állítsa a loginEndpoint értéket arra az útvonalra, amely kibontja ezt a borítékot, vagy használja a createRequestHandler metódust a mapRequest-tel a req.body[ {{envelope}}] kicsomagolásához a handlers.logIn előtt.',
  'user.error.oauthStateMismatch': 'OAuth állapoteltérés — lehetséges CSRF támadás',
  'user.error.avatarTooLarge': 'Az avatar legfeljebb {{max}} karakterből állhat.',
  'user.error.bioTooLong': 'Az életrajz legfeljebb {{max}} karakterből állhat.',
  'user.error.noUpdatableFields': 'Nem adtak meg frissíthető mezőket.',
  'user.error.oauthDataInvalid': 'Az oauthData-nak objektumnak kell lennie.',
  'user.error.subscriptionActivationRequiresVerification':
    'Az előfizetés aktiválásának nyugta-ellenőrzésen kell keresztülmennie — ehhez a POST /users /:id/verify-payment/:provider parancsot kell használnia.',
  'user.payment.noBillingAccount':
    'Nem található {{provider}} számlázási fiók ehhez a felhasználóhoz.',
  'user.payment.portalFailed': 'Nem sikerült megnyitni a {{provider}} számlázási portált.',
  'user.payment.portalNotSupported': '{{provider}} nem kínál számlázási portált.',
  'user.payment.subscriptionOwnershipMismatch': 'Ez az előfizetés nem a fiókodhoz tartozik.',
  'user.payment.transactionAlreadyClaimed': 'Ez a vásárlás már egy másik fiókhoz van társítva.',
  'user.error.completeTargetMissing':
    'Nincs olyan fiók, amelyik a completeId azonosítóként megadott.',
  'user.error.completeIdentityMismatch':
    'A megadott felhasználónév vagy e-mail cím nem azonosítja a completeId fiókot.',
  'user.error.completeNotOwned':
    'A completeId fiók OAuth-on keresztül jelentkezik be; a hitelesítő adatai itt nincsenek kiépítve.',
  'user.error.identityRequired':
    'A fiók azonosításához felhasználónévre vagy e-mail címre van szükség.',
  'user.error.usernameEmailConflict':
    'A felhasználónév és az e-mail cím két különböző, meglévő fiókhoz tartozik.',
  'user.error.oauthEmailCollision':
    'Már létezik egy fiók ehhez az e-mail címhez. Kérjük, jelentkezzen be az eredeti módszerével, majd kapcsolja össze ezt a szolgáltatót a fiókbeállításaiban.',
}
