import type { UserTranslations } from './types.js'

/** User translations for Turkish. */
export const tr: UserTranslations = {
  'user.error.badRequest': 'Geçersiz istek.',
  'user.error.notFound': 'Bulunamadı.',
  'user.error.failedToCreateSession': 'Oturum oluşturulamadı.',
  'user.error.usernameRequired': 'Kullanıcı adı gereklidir.',
  'user.error.passwordRequired': 'Şifre gereklidir.',
  'user.error.emailInvalid': 'E-posta geçersiz.',
  'user.error.usernameUnavailable': 'Kullanıcı adı mevcut değil.',
  'user.error.emailAlreadyRegistered': 'E-posta zaten kayıtlı.',
  'user.error.failedToHashPassword': 'Şifre hashleme başarısız oldu.',
  'user.error.invalidCredentials': 'Geçersiz kimlik bilgileri.',
  'user.error.invalidTwoFactorToken': 'Geçersiz iki faktörlü jeton.',
  'user.error.twoFactorVerificationUnavailable': 'İki faktörlü doğrulama kullanılamıyor.',
  'user.error.loginFailed': 'Giriş başarısız oldu.',
  'user.notification.newLogin': 'Yeni Giriş',
  'user.notification.newLoginBody': '{{deviceName}} cihazından yeni giriş.',
  'user.error.usernameCannotBeEmpty': 'Kullanıcı adı boş olamaz.',
  'user.error.usernameInvalid':
    'Kullanıcı adı yalnızca harf, rakam, nokta, kısa çizgi ve alt çizgi içerebilir.',
  'user.error.bodyNestedUnderUser':
    'Bu gövde alanlarını "user" altına yerleştiriyor; kullanıcı adı, e-posta ve şifreyi en üst düzeyde gönderin.',
  'user.error.failedToUpdateUser': 'Kullanıcı güncellenemedi.',
  'user.error.failedToDeleteUser': 'Kullanıcı silinemedi.',
  'user.error.failedToReadUser': 'Kullanıcı okunamadı.',
  'user.error.emailRequired': 'E-posta gereklidir.',
  'user.email.passwordResetSubject': '{{appName}} - Şifre Sıfırlama',
  'user.email.passwordResetText': 'Şifre sıfırlama jetonunuz: {{token}}',
  'user.email.passwordResetLink': 'Şifrenizi şu adreste sıfırlayın: {{url}}',
  'user.email.passwordResetHtml': '<p>Şifre sıfırlama jetonunuz: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Şifrenizi sıfırlayın</a></p>',
  'user.error.failedToProcessPasswordReset': 'Şifre sıfırlama işlemi başarısız oldu.',
  'user.error.newPasswordRequired': 'Yeni şifre gereklidir.',
  'user.error.currentPasswordRequired': 'Mevcut şifre gereklidir.',
  'user.error.currentPasswordIncorrect': 'Mevcut şifre yanlış.',
  'user.error.failedToUpdatePassword': 'Şifre güncellenemedi.',
  'user.error.planKeyRequired': 'planKey gereklidir.',
  'user.error.invalidPlan': 'Geçersiz plan.',
  'user.error.failedToUpdateSubscription': 'Abonelik güncellenemedi.',
  'user.error.failedToUpdatePlan': 'Plan güncellenemedi.',
  'user.error.twoFactorNotAvailable': 'İki faktörlü kimlik doğrulama kullanılamıyor.',
  'user.error.twoFactorRequiresPassword':
    'Bu hesapta iki faktörlü kimlik doğrulama etkin. Devam etmek için e-posta ve şifrenizle giriş yapın.',
  'user.error.tokenRequired': 'Jeton gereklidir.',
  'user.error.noPendingTwoFactorSetup':
    'Bekleyen iki faktörlü kurulum yok. Önce "setup" ile çağırın.',
  'user.error.invalidToken': 'Geçersiz jeton.',
  'user.error.twoFactorRequired': 'İki faktörlü kod gereklidir.',
  'user.error.twoFactorNotEnabled': 'İki faktörlü etkin değil.',
  'user.error.invalidAction': 'Geçersiz işlem. "setup", "enable" veya "disable" kullanın.',
  'user.error.twoFactorOperationFailed': 'İki faktörlü işlem başarısız oldu.',
  'user.error.oauthServerNotConfigured': 'OAuth sunucusu "{{server}}" yapılandırılmamış.',
  'user.error.oauthVerificationFailed': 'OAuth doğrulaması başarısız oldu.',
  'user.error.failedToCreateUser': 'Kullanıcı oluşturulamadı.',
  'user.error.oauthLoginFailed': 'OAuth girişi başarısız oldu.',
  'user.error.unauthorized': 'Yetkisiz',
  'user.error.passwordTooLong': 'Parola en fazla {{max}} karakter uzunluğunda olmalıdır.',
  'user.error.passwordTooShort': 'Parola en az {{min}} karakter uzunluğunda olmalıdır.',
  'user.error.tooManyRequests': 'Çok fazla deneme yapıldı. Lütfen bekleyin ve tekrar deneyin.',
  'user.error.webhookUnauthorized': 'Yetkisiz ödeme bildirimi',
  'user.error.credentialsNested':
    "Bu giriş uç noktası kimlik bilgilerini en üst düzeyde okur, ancak bu gövde bunları {{envelope}} içine yerleştirir. loginEndpoint'i bu zarfı açan rotaya ayarlayın veya handlers.logIn'den önce req.body[ {{envelope}}]'yi açmak için mapRequest ile createRequestHandler kullanın.",
  'user.error.oauthStateMismatch': 'OAuth durum uyuşmazlığı — olası CSRF saldırısı',
  'user.error.avatarTooLarge': 'Avatar en fazla {{max}} karakterden oluşmalıdır.',
  'user.error.bioTooLong': 'Biyografi en fazla {{max}} karakter uzunluğunda olmalıdır.',
  'user.error.noUpdatableFields': 'Güncellenebilir alan sağlanmadı.',
  'user.error.oauthDataInvalid': 'oauthData bir nesne olmalıdır.',
  'user.error.subscriptionActivationRequiresVerification':
    'Abonelik aktivasyonu, ödeme makbuzunun doğrulanmasından geçmelidir — bunun için POST /users /:id/verify-payment/:provider adresini kullanın.',
  'user.payment.noBillingAccount':
    'Bu kullanıcı için hiçbir {{provider}} faturalandırma hesabı bulunamadı.',
  'user.payment.portalFailed': '{{provider}} faturalama portalı açılamadı.',
  'user.payment.portalNotSupported': '{{provider}} faturalandırma portalı sunmamaktadır.',
  'user.payment.subscriptionOwnershipMismatch': 'Bu abonelik sizin hesabınıza ait değil.',
  'user.payment.transactionAlreadyClaimed':
    'Bu satın alma işlemi zaten başka bir hesapla ilişkilendirilmiş durumda.',
  'user.error.completeTargetMissing': 'completeId olarak verilen kimliğe sahip bir hesap yok.',
  'user.error.completeIdentityMismatch':
    'Verilen kullanıcı adı veya e-posta adresi completeId hesabını tanımlamaz.',
  'user.error.completeNotOwned':
    'completeId hesabı OAuth üzerinden oturum açar; kimlik bilgileri burada sağlanmaz.',
  'user.error.identityRequired':
    'Hesabın tanımlanması için kullanıcı adı veya e-posta adresi gereklidir.',
  'user.error.usernameEmailConflict':
    'Kullanıcı adı ve e-posta adresi, mevcut iki farklı hesaba aittir.',
  'user.error.oauthEmailCollision':
    'Bu e-posta adresi için zaten bir hesap mevcut. Lütfen orijinal giriş yönteminizle oturum açın, ardından hesap ayarlarınızdan bu sağlayıcıyı bağlayın.',
}
