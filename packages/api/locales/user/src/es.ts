import type { UserTranslations } from './types.js'

/** User translations for Spanish. */
export const es: UserTranslations = {
  'user.error.badRequest': 'Solicitud incorrecta.',
  'user.error.notFound': 'No encontrado.',
  'user.error.failedToCreateSession': 'No se pudo crear la sesión.',
  'user.error.usernameRequired': 'Se requiere un nombre de usuario.',
  'user.error.passwordRequired': 'Se requiere una contraseña.',
  'user.error.emailInvalid': 'El correo electrónico no es válido.',
  'user.error.usernameUnavailable': 'El nombre de usuario no está disponible.',
  'user.error.emailAlreadyRegistered': 'El correo electrónico ya está registrado.',
  'user.error.failedToHashPassword': 'No se pudo cifrar la contraseña.',
  'user.error.invalidCredentials': 'Credenciales no válidas.',
  'user.error.invalidTwoFactorToken': 'Token de doble factor no válido.',
  'user.error.twoFactorVerificationUnavailable': 'Verificación de doble factor no disponible.',
  'user.error.loginFailed': 'El inicio de sesión falló.',
  'user.notification.newLogin': 'Nuevo inicio de sesión',
  'user.notification.newLoginBody': 'Nuevo inicio de sesión desde {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'El nombre de usuario no puede estar vacío.',
  'user.error.usernameInvalid':
    'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos.',
  'user.error.bodyNestedUnderUser':
    'Este cuerpo anida sus campos bajo "user"; envía el nombre de usuario, el correo y la contraseña en el nivel superior.',
  'user.error.failedToUpdateUser': 'No se pudo actualizar el usuario.',
  'user.error.failedToDeleteUser': 'No se pudo eliminar el usuario.',
  'user.error.failedToReadUser': 'No se pudo leer el usuario.',
  'user.error.emailRequired': 'Se requiere un correo electrónico.',
  'user.email.passwordResetSubject': '{{appName}} - Restablecimiento de contraseña',
  'user.email.passwordResetText': 'Su token de restablecimiento de contraseña es: {{token}}',
  'user.email.passwordResetLink': 'Restablezca su contraseña en: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Su token de restablecimiento de contraseña es: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Restablezca su contraseña</a></p>',
  'user.error.failedToProcessPasswordReset':
    'No se pudo procesar el restablecimiento de contraseña.',
  'user.error.newPasswordRequired': 'Se requiere una contraseña nueva.',
  'user.error.currentPasswordRequired': 'Se requiere la contraseña actual.',
  'user.error.currentPasswordIncorrect': 'La contraseña actual es incorrecta.',
  'user.error.failedToUpdatePassword': 'No se pudo actualizar la contraseña.',
  'user.error.planKeyRequired': 'Se requiere planKey.',
  'user.error.invalidPlan': 'Plan no válido.',
  'user.error.failedToUpdateSubscription': 'No se pudo actualizar la suscripción.',
  'user.error.failedToUpdatePlan': 'No se pudo actualizar el plan.',
  'user.error.twoFactorNotAvailable': 'La autenticación de doble factor no está disponible.',
  'user.error.twoFactorRequiresPassword':
    'La autenticación de doble factor está activada en esta cuenta. Inicia sesión con tu correo electrónico y contraseña para continuar.',
  'user.error.tokenRequired': 'Se requiere un token.',
  'user.error.noPendingTwoFactorSetup':
    'No hay configuración de doble factor pendiente. Llame primero con la acción "setup".',
  'user.error.invalidToken': 'Token no válido.',
  'user.error.twoFactorRequired': 'Se requiere un código de doble factor.',
  'user.error.twoFactorNotEnabled': 'El doble factor no está activado.',
  'user.error.invalidAction': 'Acción no válida. Use "setup", "enable" o "disable".',
  'user.error.twoFactorOperationFailed': 'La operación de doble factor falló.',
  'user.error.oauthServerNotConfigured': 'El servidor OAuth "{{server}}" no está configurado.',
  'user.error.oauthVerificationFailed': 'La verificación OAuth falló.',
  'user.error.failedToCreateUser': 'No se pudo crear el usuario.',
  'user.error.oauthLoginFailed': 'El inicio de sesión OAuth falló.',
  'user.error.unauthorized': 'No autorizado',
  'user.error.passwordTooLong': 'La contraseña debe tener como máximo {{max}} caracteres.',
  'user.error.passwordTooShort': 'La contraseña debe tener al menos {{min}} caracteres.',
  'user.error.tooManyRequests': 'Demasiados intentos. Por favor, espere e inténtelo de nuevo.',
  'user.error.webhookUnauthorized': 'Notificación de pago no autorizado',
  'user.error.credentialsNested':
    'Este endpoint de inicio de sesión lee las credenciales en el nivel superior, pero este cuerpo las anida bajo {{envelope}}. Establezca loginEndpoint en la ruta que desenvuelve este sobre, o use createRequestHandler con mapRequest para desenvolver req.body[ {{envelope}}] antes de handlers.logIn.',
  'user.error.oauthStateMismatch': 'Discrepancia en el estado de OAuth: posible ataque CSRF',
  'user.error.avatarTooLarge': 'El avatar debe tener {{max}} caracteres o menos.',
  'user.error.bioTooLong': 'La biografía debe tener {{max}} caracteres o menos.',
  'user.error.noUpdatableFields': 'No se proporcionaron campos actualizables.',
  'user.error.oauthDataInvalid': 'oauthData debe ser un objeto.',
  'user.error.subscriptionActivationRequiresVerification':
    'La activación de la suscripción debe pasar por la verificación del recibo; utilice POST /users /:id/verify-payment/:provider.',
  'user.payment.noBillingAccount':
    'No se encontró ninguna cuenta de facturación {{provider}} para este usuario.',
  'user.payment.portalFailed': 'No se pudo abrir el portal de facturación {{provider}} .',
  'user.payment.portalNotSupported': '{{provider}} no ofrece un portal de facturación.',
  'user.payment.subscriptionOwnershipMismatch': 'Esta suscripción no pertenece a tu cuenta.',
  'user.payment.transactionAlreadyClaimed': 'Esta compra ya está asociada a otra cuenta.',
  'user.error.completeTargetMissing':
    'No existe ninguna cuenta con el ID proporcionado como completeId.',
  'user.error.completeIdentityMismatch':
    'El nombre de usuario o correo electrónico proporcionado no identifica la cuenta completeId.',
  'user.error.completeNotOwned':
    'La cuenta completeId inicia sesión a través de OAuth; sus credenciales no se proporcionan aquí.',
  'user.error.identityRequired':
    'Para el aprovisionamiento se necesita un nombre de usuario o un correo electrónico para identificar la cuenta.',
  'user.error.usernameEmailConflict':
    'El nombre de usuario y el correo electrónico pertenecen a dos cuentas existentes diferentes.',
  'user.error.oauthEmailCollision':
    'Ya existe una cuenta asociada a este correo electrónico. Inicie sesión con su método de inicio de sesión original y, a continuación, vincule este proveedor desde la configuración de su cuenta.',
}
