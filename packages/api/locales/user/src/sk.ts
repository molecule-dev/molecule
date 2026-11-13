import type { UserTranslations } from './types.js'

/** User translations for Slovak. */
export const sk: UserTranslations = {
  'user.error.badRequest': 'Chybná požiadavka.',
  'user.error.notFound': 'Nenájdené.',
  'user.error.failedToCreateSession': 'Nepodarilo sa vytvoriť reláciu.',
  'user.error.usernameRequired': 'Používateľské meno je povinné.',
  'user.error.passwordRequired': 'Heslo je povinné.',
  'user.error.emailInvalid': 'E-mail je neplatný.',
  'user.error.usernameUnavailable': 'Používateľské meno nie je dostupné.',
  'user.error.emailAlreadyRegistered': 'E-mail je už zaregistrovaný.',
  'user.error.failedToHashPassword': 'Nepodarilo sa zahashovať heslo.',
  'user.error.invalidCredentials': 'Neplatné prihlasovacie údaje.',
  'user.error.invalidTwoFactorToken': 'Neplatný dvojfaktorový token.',
  'user.error.twoFactorVerificationUnavailable': 'Dvojfaktorové overenie nedostupné.',
  'user.error.loginFailed': 'Prihlásenie zlyhalo.',
  'user.notification.newLogin': 'Nové prihlásenie',
  'user.notification.newLoginBody': 'Nové prihlásenie z {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Používateľské meno nemôže byť prázdne.',
  'user.error.usernameInvalid':
    'Používateľské meno môže obsahovať iba písmená, číslice, bodky, pomlčky a podčiarkovníky.',
  'user.error.bodyNestedUnderUser':
    'Toto telo vnára svoje polia pod "user"; pošlite používateľské meno, e-mail a heslo na najvyššej úrovni.',
  'user.error.failedToUpdateUser': 'Nepodarilo sa aktualizovať používateľa.',
  'user.error.failedToDeleteUser': 'Nepodarilo sa odstrániť používateľa.',
  'user.error.failedToReadUser': 'Nepodarilo sa prečítať používateľa.',
  'user.error.emailRequired': 'E-mail je povinný.',
  'user.email.passwordResetSubject': '{{appName}} - Obnovenie hesla',
  'user.email.passwordResetText': 'Váš token na obnovenie hesla je: {{token}}',
  'user.email.passwordResetLink': 'Obnovte heslo na: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Váš token na obnovenie hesla je: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Obnovte svoje heslo</a></p>',
  'user.error.failedToProcessPasswordReset': 'Nepodarilo sa spracovať obnovenie hesla.',
  'user.error.newPasswordRequired': 'Nové heslo je povinné.',
  'user.error.currentPasswordRequired': 'Aktuálne heslo je povinné.',
  'user.error.currentPasswordIncorrect': 'Aktuálne heslo je nesprávne.',
  'user.error.failedToUpdatePassword': 'Nepodarilo sa aktualizovať heslo.',
  'user.error.planKeyRequired': 'planKey je povinný.',
  'user.error.invalidPlan': 'Neplatný plán.',
  'user.error.failedToUpdateSubscription': 'Nepodarilo sa aktualizovať predplatné.',
  'user.error.failedToUpdatePlan': 'Nepodarilo sa aktualizovať plán.',
  'user.error.twoFactorNotAvailable': 'Dvojfaktorové overenie nie je dostupné.',
  'user.error.twoFactorRequiresPassword':
    'Na tomto účte je zapnuté dvojfaktorové overenie. Pokračujte prihlásením pomocou e-mailu a hesla.',
  'user.error.tokenRequired': 'Token je povinný.',
  'user.error.noPendingTwoFactorSetup':
    'Žiadne čakajúce dvojfaktorové nastavenie. Najprv zavolajte s akciou "setup".',
  'user.error.invalidToken': 'Neplatný token.',
  'user.error.twoFactorRequired': 'Vyžaduje sa dvojfaktorový kód.',
  'user.error.twoFactorNotEnabled': 'Dvojfaktorové overenie nie je povolené.',
  'user.error.invalidAction': 'Neplatná akcia. Použite "setup", "enable" alebo "disable".',
  'user.error.twoFactorOperationFailed': 'Dvojfaktorová operácia zlyhala.',
  'user.error.oauthServerNotConfigured': 'OAuth server "{{server}}" nie je nakonfigurovaný.',
  'user.error.oauthVerificationFailed': 'OAuth overenie zlyhalo.',
  'user.error.failedToCreateUser': 'Nepodarilo sa vytvoriť používateľa.',
  'user.error.oauthLoginFailed': 'OAuth prihlásenie zlyhalo.',
  'user.error.unauthorized': 'Neoprávnené',
  'user.error.passwordTooLong': 'Heslo musí mať maximálne {{max}} znakov',
  'user.error.passwordTooShort': 'Heslo musí mať aspoň {{min}} znakov',
  'user.error.tooManyRequests': 'Príliš veľa pokusov. Počkajte a skúste to znova.',
  'user.error.webhookUnauthorized': 'Oznámenie o neoprávnenej platbe',
  'user.error.credentialsNested':
    'Tento prihlasovací koncový bod číta poverenia na najvyššej úrovni, ale toto telo ich vnoruje pod {{envelope}}. Nastavte loginEndpoint na trasu, ktorá rozbalí túto obálku, alebo použite createRequestHandler s mapRequest na rozbalenie req.body[ {{envelope}}] pred handlers.logIn.',
  'user.error.oauthStateMismatch': 'Nezhoda stavu OAuth – možný útok CSRF',
  'user.error.avatarTooLarge': 'Avatar musí mať {{max}} znakov alebo menej.',
  'user.error.bioTooLong': 'Životopis musí mať {{max}} znakov alebo menej.',
  'user.error.noUpdatableFields': 'Neboli poskytnuté žiadne aktualizovateľné polia.',
  'user.error.oauthDataInvalid': 'oauthData musí byť objekt.',
  'user.error.subscriptionActivationRequiresVerification':
    'Aktivácia predplatného musí prejsť overením potvrdenky – použite POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount':
    'Pre tohto používateľa sa nenašiel žiadny fakturačný účet {{provider}} .',
  'user.payment.portalFailed': 'Nepodarilo sa otvoriť fakturačný portál {{provider}} .',
  'user.payment.portalNotSupported': '{{provider}} neponúka fakturačný portál.',
  'user.payment.subscriptionOwnershipMismatch': 'Toto predplatné nepatrí k vášmu účtu.',
  'user.payment.transactionAlreadyClaimed': 'Tento nákup je už prepojený s iným účtom.',
  'user.error.completeTargetMissing': 'Neexistuje žiadny účet s ID uvedeným ako completeId.',
  'user.error.completeIdentityMismatch':
    'Zadané používateľské meno alebo e-mail neidentifikuje účet completeId.',
  'user.error.completeNotOwned':
    'Účet completeId sa prihlasuje cez OAuth; jeho poverenia tu nie sú poskytované.',
  'user.error.identityRequired':
    'Na identifikáciu účtu je potrebné používateľské meno alebo e-mail.',
  'user.error.usernameEmailConflict':
    'Používateľské meno a e-mail patria k dvom rôznym existujúcim účtom.',
  'user.error.oauthEmailCollision':
    'Pre tento e-mail už existuje účet. Prihláste sa pôvodným spôsobom a potom prepojte tohto poskytovateľa v nastaveniach účtu.',
}
