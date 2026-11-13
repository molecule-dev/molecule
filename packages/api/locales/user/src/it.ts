import type { UserTranslations } from './types.js'

/** User translations for Italian. */
export const it: UserTranslations = {
  'user.error.badRequest': 'Richiesta non valida.',
  'user.error.notFound': 'Non trovato.',
  'user.error.failedToCreateSession': 'Impossibile creare la sessione.',
  'user.error.usernameRequired': 'Il nome utente è obbligatorio.',
  'user.error.passwordRequired': 'La password è obbligatoria.',
  'user.error.emailInvalid': "L'indirizzo email non è valido.",
  'user.error.usernameUnavailable': 'Il nome utente non è disponibile.',
  'user.error.emailAlreadyRegistered': "L'indirizzo email è già registrato.",
  'user.error.failedToHashPassword': 'Impossibile cifrare la password.',
  'user.error.invalidCredentials': 'Credenziali non valide.',
  'user.error.invalidTwoFactorToken': 'Token a due fattori non valido.',
  'user.error.twoFactorVerificationUnavailable': 'Verifica a due fattori non disponibile.',
  'user.error.loginFailed': "L'accesso è fallito.",
  'user.notification.newLogin': 'Nuovo accesso',
  'user.notification.newLoginBody': 'Nuovo accesso da {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Il nome utente non può essere vuoto.',
  'user.error.usernameInvalid':
    'Il nome utente può contenere solo lettere, numeri, punti, trattini e trattini bassi.',
  'user.error.bodyNestedUnderUser':
    'Questo corpo annida i suoi campi sotto "user"; invia nome utente, email e password al livello superiore.',
  'user.error.failedToUpdateUser': "Impossibile aggiornare l'utente.",
  'user.error.failedToDeleteUser': "Impossibile eliminare l'utente.",
  'user.error.failedToReadUser': "Impossibile leggere l'utente.",
  'user.error.emailRequired': "L'indirizzo email è obbligatorio.",
  'user.email.passwordResetSubject': '{{appName}} - Reimpostazione password',
  'user.email.passwordResetText': 'Il tuo token di reimpostazione password è: {{token}}',
  'user.email.passwordResetLink': 'Reimposta la tua password su: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Il tuo token di reimpostazione password è: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Reimposta la tua password</a></p>',
  'user.error.failedToProcessPasswordReset':
    'Impossibile elaborare la reimpostazione della password.',
  'user.error.newPasswordRequired': 'Una nuova password è obbligatoria.',
  'user.error.currentPasswordRequired': 'La password attuale è obbligatoria.',
  'user.error.currentPasswordIncorrect': 'La password attuale non è corretta.',
  'user.error.failedToUpdatePassword': 'Impossibile aggiornare la password.',
  'user.error.planKeyRequired': 'planKey è obbligatorio.',
  'user.error.invalidPlan': 'Piano non valido.',
  'user.error.failedToUpdateSubscription': "Impossibile aggiornare l'abbonamento.",
  'user.error.failedToUpdatePlan': 'Impossibile aggiornare il piano.',
  'user.error.twoFactorNotAvailable': "L'autenticazione a due fattori non è disponibile.",
  'user.error.twoFactorRequiresPassword':
    "L'autenticazione a due fattori è attiva su questo account. Accedi con la tua email e la password per continuare.",
  'user.error.tokenRequired': 'Il token è obbligatorio.',
  'user.error.noPendingTwoFactorSetup':
    'Nessuna configurazione a due fattori in sospeso. Chiamare prima con l\'azione "setup".',
  'user.error.invalidToken': 'Token non valido.',
  'user.error.twoFactorRequired': 'È richiesto un codice a due fattori.',
  'user.error.twoFactorNotEnabled': "L'autenticazione a due fattori non è attivata.",
  'user.error.invalidAction': 'Azione non valida. Utilizzare "setup", "enable" o "disable".',
  'user.error.twoFactorOperationFailed': "L'operazione a due fattori è fallita.",
  'user.error.oauthServerNotConfigured': 'Il server OAuth "{{server}}" non è configurato.',
  'user.error.oauthVerificationFailed': 'La verifica OAuth è fallita.',
  'user.error.failedToCreateUser': "Impossibile creare l'utente.",
  'user.error.oauthLoginFailed': "L'accesso OAuth è fallito.",
  'user.error.unauthorized': 'Non autorizzato',
  'user.error.passwordTooLong': 'La password deve contenere al massimo {{max}} caratteri',
  'user.error.passwordTooShort': 'La password deve essere lunga almeno {{min}} caratteri',
  'user.error.tooManyRequests': 'Troppi tentativi. Attendi e riprova.',
  'user.error.webhookUnauthorized': 'Notifica di pagamento non autorizzato',
  'user.error.credentialsNested':
    'Questo endpoint di login legge le credenziali al livello superiore, ma questo corpo le annida sotto {{envelope}}. Imposta loginEndpoint sulla rotta che estrae questo envelope, oppure usa createRequestHandler con mapRequest per estrarre req.body[ {{envelope}}] prima di handlers.logIn.',
  'user.error.oauthStateMismatch':
    'Mancata corrispondenza dello stato OAuth: possibile attacco CSRF.',
  'user.error.avatarTooLarge': "L'avatar deve contenere al massimo {{max}} caratteri.",
  'user.error.bioTooLong': 'La biografia deve contenere al massimo {{max}} caratteri.',
  'user.error.noUpdatableFields': 'Non erano previsti campi aggiornabili.',
  'user.error.oauthDataInvalid': 'oauthData deve essere un oggetto.',
  'user.error.subscriptionActivationRequiresVerification':
    "L'attivazione dell'abbonamento deve passare attraverso la verifica della ricevuta: utilizzare POST /users /:id/verify-payment/:provider.",
  'user.payment.noBillingAccount':
    'Nessun account di fatturazione {{provider}} trovato per questo utente.',
  'user.payment.portalFailed': 'Impossibile aprire il portale di fatturazione {{provider}} .',
  'user.payment.portalNotSupported': '{{provider}} non offre un portale di fatturazione.',
  'user.payment.subscriptionOwnershipMismatch':
    'Questo abbonamento non è associato al tuo account.',
  'user.payment.transactionAlreadyClaimed': 'Questo acquisto è già associato a un altro account.',
  'user.error.completeTargetMissing': "Non esiste alcun account con l'ID fornito come completeId.",
  'user.error.completeIdentityMismatch':
    "Il nome utente o l'indirizzo email forniti non identificano l'account completeId.",
  'user.error.completeNotOwned':
    "L'account completeId effettua l'accesso tramite OAuth; le sue credenziali non vengono fornite qui.",
  'user.error.identityRequired':
    "Per effettuare il provisioning è necessario un nome utente o un indirizzo email per identificare l'account.",
  'user.error.usernameEmailConflict':
    "Il nome utente e l'indirizzo email appartengono a due account diversi già esistenti.",
  'user.error.oauthEmailCollision':
    'Esiste già un account per questo indirizzo email. Accedi con il tuo metodo di accesso abituale, quindi collega questo provider dalle impostazioni del tuo account.',
}
