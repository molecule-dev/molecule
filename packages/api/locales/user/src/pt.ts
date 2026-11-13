import type { UserTranslations } from './types.js'

/** User translations for Portuguese. */
export const pt: UserTranslations = {
  'user.error.badRequest': 'Pedido inválido.',
  'user.error.notFound': 'Não encontrado.',
  'user.error.failedToCreateSession': 'Não foi possível criar a sessão.',
  'user.error.usernameRequired': 'O nome de utilizador é obrigatório.',
  'user.error.passwordRequired': 'A palavra-passe é obrigatória.',
  'user.error.emailInvalid': 'O endereço de e-mail é inválido.',
  'user.error.usernameUnavailable': 'O nome de utilizador não está disponível.',
  'user.error.emailAlreadyRegistered': 'O endereço de e-mail já está registado.',
  'user.error.failedToHashPassword': 'Não foi possível cifrar a palavra-passe.',
  'user.error.invalidCredentials': 'Credenciais inválidas.',
  'user.error.invalidTwoFactorToken': 'Token de dois fatores inválido.',
  'user.error.twoFactorVerificationUnavailable': 'Verificação de dois fatores indisponível.',
  'user.error.loginFailed': 'O início de sessão falhou.',
  'user.notification.newLogin': 'Novo início de sessão',
  'user.notification.newLoginBody': 'Novo início de sessão a partir de {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'O nome de utilizador não pode estar vazio.',
  'user.error.usernameInvalid':
    'O nome de usuário só pode conter letras, números, pontos, hifens e sublinhados.',
  'user.error.bodyNestedUnderUser':
    'Este corpo aninha seus campos sob "user"; envie nome de usuário, e-mail e senha no nível superior.',
  'user.error.failedToUpdateUser': 'Não foi possível atualizar o utilizador.',
  'user.error.failedToDeleteUser': 'Não foi possível eliminar o utilizador.',
  'user.error.failedToReadUser': 'Não foi possível ler o utilizador.',
  'user.error.emailRequired': 'O endereço de e-mail é obrigatório.',
  'user.email.passwordResetSubject': '{{appName}} - Redefinição de palavra-passe',
  'user.email.passwordResetText': 'O seu token de redefinição de palavra-passe é: {{token}}',
  'user.email.passwordResetLink': 'Redefina a sua palavra-passe em: {{url}}',
  'user.email.passwordResetHtml':
    '<p>O seu token de redefinição de palavra-passe é: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Redefina a sua palavra-passe</a></p>',
  'user.error.failedToProcessPasswordReset':
    'Não foi possível processar a redefinição da palavra-passe.',
  'user.error.newPasswordRequired': 'Uma nova palavra-passe é obrigatória.',
  'user.error.currentPasswordRequired': 'A palavra-passe atual é obrigatória.',
  'user.error.currentPasswordIncorrect': 'A palavra-passe atual está incorreta.',
  'user.error.failedToUpdatePassword': 'Não foi possível atualizar a palavra-passe.',
  'user.error.planKeyRequired': 'planKey é obrigatório.',
  'user.error.invalidPlan': 'Plano inválido.',
  'user.error.failedToUpdateSubscription': 'Não foi possível atualizar a subscrição.',
  'user.error.failedToUpdatePlan': 'Não foi possível atualizar o plano.',
  'user.error.twoFactorNotAvailable': 'A autenticação de dois fatores não está disponível.',
  'user.error.twoFactorRequiresPassword':
    'A autenticação de dois fatores está ativada nesta conta. Inicie sessão com o seu e-mail e palavra-passe para continuar.',
  'user.error.tokenRequired': 'O token é obrigatório.',
  'user.error.noPendingTwoFactorSetup':
    'Nenhuma configuração de dois fatores pendente. Chame primeiro com a ação "setup".',
  'user.error.invalidToken': 'Token inválido.',
  'user.error.twoFactorRequired': 'É necessário um código de dois fatores.',
  'user.error.twoFactorNotEnabled': 'A autenticação de dois fatores não está ativada.',
  'user.error.invalidAction': 'Ação inválida. Utilize "setup", "enable" ou "disable".',
  'user.error.twoFactorOperationFailed': 'A operação de dois fatores falhou.',
  'user.error.oauthServerNotConfigured': 'O servidor OAuth "{{server}}" não está configurado.',
  'user.error.oauthVerificationFailed': 'A verificação OAuth falhou.',
  'user.error.failedToCreateUser': 'Não foi possível criar o utilizador.',
  'user.error.oauthLoginFailed': 'O início de sessão OAuth falhou.',
  'user.error.unauthorized': 'Não autorizado',
  'user.error.passwordTooLong': 'A senha deve ter no máximo {{max}} caracteres.',
  'user.error.passwordTooShort': 'A senha deve ter pelo menos {{min}} caracteres',
  'user.error.tooManyRequests': 'Muitas tentativas foram feitas. Aguarde e tente novamente.',
  'user.error.webhookUnauthorized': 'Notificação de pagamento não autorizado',
  'user.error.credentialsNested':
    'Este endpoint de login lê as credenciais no nível superior, mas este corpo as aninha em {{envelope}}. Defina loginEndpoint para a rota que desembrulha este envelope ou use createRequestHandler com mapRequest para desembrulhar req.body[ {{envelope}}] antes de handlers.logIn.',
  'user.error.oauthStateMismatch': 'Incompatibilidade de estado OAuth — possível ataque CSRF',
  'user.error.avatarTooLarge': 'O avatar deve ter no máximo {{max}} caracteres.',
  'user.error.bioTooLong': 'A biografia deve ter no máximo {{max}} caracteres.',
  'user.error.noUpdatableFields': 'Não foram fornecidos campos atualizáveis.',
  'user.error.oauthDataInvalid': 'oauthData deve ser um objeto.',
  'user.error.subscriptionActivationRequiresVerification':
    'A ativação da assinatura deve passar pela verificação do recibo — use POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount':
    'Nenhuma conta de faturamento {{provider}} foi encontrada para este usuário.',
  'user.payment.portalFailed': 'Não foi possível abrir o portal de faturamento {{provider}} .',
  'user.payment.portalNotSupported': '{{provider}} não oferece um portal de faturamento.',
  'user.payment.subscriptionOwnershipMismatch': 'Esta assinatura não pertence à sua conta.',
  'user.payment.transactionAlreadyClaimed': 'Esta compra já está associada a outra conta.',
  'user.error.completeTargetMissing':
    'Não existe nenhuma conta com o ID fornecido como completeId.',
  'user.error.completeIdentityMismatch':
    'O nome de usuário ou e-mail fornecido não identifica a conta completeId.',
  'user.error.completeNotOwned':
    'A conta completeId faz login por meio do OAuth; suas credenciais não são fornecidas aqui.',
  'user.error.identityRequired':
    'O provisionamento requer um nome de usuário ou um endereço de e-mail para identificar a conta.',
  'user.error.usernameEmailConflict':
    'O nome de usuário e o e-mail pertencem a duas contas diferentes já existentes.',
  'user.error.oauthEmailCollision':
    'Já existe uma conta associada a este e-mail. Faça login com seu método de pagamento original e, em seguida, vincule este provedor nas configurações da sua conta.',
}
