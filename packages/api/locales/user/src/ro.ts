import type { UserTranslations } from './types.js'

/** User translations for Romanian. */
export const ro: UserTranslations = {
  'user.error.badRequest': 'Cerere invalidă.',
  'user.error.notFound': 'Nu a fost găsit.',
  'user.error.failedToCreateSession': 'Nu s-a putut crea sesiunea.',
  'user.error.usernameRequired': 'Numele de utilizator este obligatoriu.',
  'user.error.passwordRequired': 'Parola este obligatorie.',
  'user.error.emailInvalid': 'Adresa de e-mail este invalidă.',
  'user.error.usernameUnavailable': 'Numele de utilizator nu este disponibil.',
  'user.error.emailAlreadyRegistered': 'Adresa de e-mail este deja înregistrată.',
  'user.error.failedToHashPassword': 'Nu s-a putut cripta parola.',
  'user.error.invalidCredentials': 'Credențiale invalide.',
  'user.error.invalidTwoFactorToken': 'Token cu doi factori invalid.',
  'user.error.twoFactorVerificationUnavailable': 'Verificarea cu doi factori indisponibilă.',
  'user.error.loginFailed': 'Autentificarea a eșuat.',
  'user.notification.newLogin': 'Autentificare nouă',
  'user.notification.newLoginBody': 'Autentificare nouă de pe {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Numele de utilizator nu poate fi gol.',
  'user.error.usernameInvalid':
    'Numele de utilizator poate conține doar litere, cifre, puncte, cratime și caractere de subliniere.',
  'user.error.bodyNestedUnderUser':
    'Acest corp își imbrică câmpurile sub "user"; trimiteți numele de utilizator, e-mailul și parola la nivelul superior.',
  'user.error.failedToUpdateUser': 'Nu s-a putut actualiza utilizatorul.',
  'user.error.failedToDeleteUser': 'Nu s-a putut șterge utilizatorul.',
  'user.error.failedToReadUser': 'Nu s-a putut citi utilizatorul.',
  'user.error.emailRequired': 'Adresa de e-mail este obligatorie.',
  'user.email.passwordResetSubject': '{{appName}} - Resetarea parolei',
  'user.email.passwordResetText': 'Token-ul dumneavoastră de resetare a parolei este: {{token}}',
  'user.email.passwordResetLink': 'Resetați parola la: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Token-ul dumneavoastră de resetare a parolei este: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Resetați parola</a></p>',
  'user.error.failedToProcessPasswordReset': 'Nu s-a putut procesa resetarea parolei.',
  'user.error.newPasswordRequired': 'O parolă nouă este obligatorie.',
  'user.error.currentPasswordRequired': 'Parola curentă este obligatorie.',
  'user.error.currentPasswordIncorrect': 'Parola curentă este incorectă.',
  'user.error.failedToUpdatePassword': 'Nu s-a putut actualiza parola.',
  'user.error.planKeyRequired': 'planKey este obligatoriu.',
  'user.error.invalidPlan': 'Plan invalid.',
  'user.error.failedToUpdateSubscription': 'Nu s-a putut actualiza abonamentul.',
  'user.error.failedToUpdatePlan': 'Nu s-a putut actualiza planul.',
  'user.error.twoFactorNotAvailable': 'Autentificarea cu doi factori nu este disponibilă.',
  'user.error.twoFactorRequiresPassword':
    'Autentificarea cu doi factori este activată pe acest cont. Conectați-vă cu e-mailul și parola pentru a continua.',
  'user.error.tokenRequired': 'Token-ul este obligatoriu.',
  'user.error.noPendingTwoFactorSetup':
    'Nicio configurare cu doi factori în așteptare. Apelați mai întâi cu acțiunea "setup".',
  'user.error.invalidToken': 'Token invalid.',
  'user.error.twoFactorRequired': 'Este necesar un cod cu doi factori.',
  'user.error.twoFactorNotEnabled': 'Autentificarea cu doi factori nu este activată.',
  'user.error.invalidAction': 'Acțiune invalidă. Utilizați "setup", "enable" sau "disable".',
  'user.error.twoFactorOperationFailed': 'Operațiunea cu doi factori a eșuat.',
  'user.error.oauthServerNotConfigured': 'Serverul OAuth "{{server}}" nu este configurat.',
  'user.error.oauthVerificationFailed': 'Verificarea OAuth a eșuat.',
  'user.error.failedToCreateUser': 'Nu s-a putut crea utilizatorul.',
  'user.error.oauthLoginFailed': 'Autentificarea OAuth a eșuat.',
  'user.error.unauthorized': 'Neautorizat',
  'user.error.passwordTooLong': 'Parola trebuie să aibă cel mult {{max}} caractere',
  'user.error.passwordTooShort': 'Parola trebuie să aibă cel puțin {{min}} caractere',
  'user.error.tooManyRequests':
    'Prea multe încercări. Vă rugăm să așteptați și să încercați din nou.',
  'user.error.webhookUnauthorized': 'Notificare de plată neautorizată',
  'user.error.credentialsNested':
    'Acest punct final de conectare citește acreditările la nivelul superior, dar acest body le imbrica sub {{envelope}}. Setați loginEndpoint la ruta care desface acest plic sau utilizați createRequestHandler cu mapRequest pentru a desface req.body[ {{envelope}}] înainte de handlers.logIn.',
  'user.error.oauthStateMismatch': 'Neconcordanță de stare OAuth — posibil atac CSRF',
  'user.error.avatarTooLarge': 'Avatarul trebuie să aibă maximum {{max}} caractere.',
  'user.error.bioTooLong': 'Biografia trebuie să aibă maximum {{max}} caractere.',
  'user.error.noUpdatableFields': 'Nu au fost furnizate câmpuri actualizabile.',
  'user.error.oauthDataInvalid': 'oauthData trebuie să fie un obiect.',
  'user.error.subscriptionActivationRequiresVerification':
    'Activarea abonamentului trebuie să treacă prin verificarea chitanței — folosiți comanda POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount':
    'Nu a fost găsit niciun cont de facturare {{provider}} pentru acest utilizator.',
  'user.payment.portalFailed': 'Nu s-a putut deschide portalul de facturare {{provider}} .',
  'user.payment.portalNotSupported': '{{provider}} nu oferă un portal de facturare.',
  'user.payment.subscriptionOwnershipMismatch': 'Acest abonament nu aparține contului tău.',
  'user.payment.transactionAlreadyClaimed': 'Această achiziție este deja asociată cu un alt cont.',
  'user.error.completeTargetMissing': 'Nu există niciun cont cu ID-ul furnizat ca completeId.',
  'user.error.completeIdentityMismatch':
    'Numele de utilizator sau adresa de e-mail furnizate nu identifică contul completeId.',
  'user.error.completeNotOwned':
    'Contul completeId se conectează prin OAuth; acreditările sale nu sunt furnizate aici.',
  'user.error.identityRequired':
    'Provisionarea necesită un nume de utilizator sau o adresă de e-mail pentru a identifica contul.',
  'user.error.usernameEmailConflict':
    'Numele de utilizator și adresa de e-mail aparțin a două conturi existente diferite.',
  'user.error.oauthEmailCollision':
    'Există deja un cont pentru această adresă de e-mail. Vă rugăm să vă conectați cu metoda originală, apoi să conectați acest furnizor din setările contului.',
}
