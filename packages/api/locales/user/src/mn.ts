import type { UserTranslations } from './types.js'

/** User translations for Mongolian. */
export const mn: UserTranslations = {
  'user.error.badRequest': 'Буруу хүсэлт.',
  'user.error.notFound': 'Олдсонгүй.',
  'user.error.failedToCreateSession': 'Сессия үүсгэхэд алдаа гарлаа.',
  'user.error.usernameRequired': 'Хэрэглэгчийн нэр шаардлагатай.',
  'user.error.passwordRequired': 'Нууц үг шаардлагатай.',
  'user.error.emailInvalid': 'Имэйл буруу байна.',
  'user.error.usernameUnavailable': 'Хэрэглэгчийн нэр боломжгүй.',
  'user.error.emailAlreadyRegistered': 'Имэйл аль хэдийн бүртгэгдсэн.',
  'user.error.failedToHashPassword': 'Нууц үг хэшлэхэд алдаа гарлаа.',
  'user.error.invalidCredentials': 'Буруу итгэмжлэл.',
  'user.error.invalidTwoFactorToken': 'Буруу хоёр хүчин зүйлийн токен.',
  'user.error.twoFactorVerificationUnavailable': 'Хоёр хүчин зүйлийн баталгаажуулалт боломжгүй.',
  'user.error.loginFailed': 'Нэвтрэлт амжилтгүй.',
  'user.notification.newLogin': 'Шинэ нэвтрэлт',
  'user.notification.newLoginBody': '{{deviceName}}-аас шинэ нэвтрэлт.',
  'user.error.usernameCannotBeEmpty': 'Хэрэглэгчийн нэр хоосон байж болохгүй.',
  'user.error.usernameInvalid':
    'Хэрэглэгчийн нэр зөвхөн үсэг, тоо, цэг, зураас, доогуур зураас агуулж болно.',
  'user.error.bodyNestedUnderUser':
    'Энэ хүсэлт талбаруудаа "user" дотор байрлуулдаг; хэрэглэгчийн нэр, имэйл, нууц үгээ дээд түвшинд илгээнэ үү.',
  'user.error.failedToUpdateUser': 'Хэрэглэгч шинэчлэхэд алдаа гарлаа.',
  'user.error.failedToDeleteUser': 'Хэрэглэгч устгахад алдаа гарлаа.',
  'user.error.failedToReadUser': 'Хэрэглэгч уншихад алдаа гарлаа.',
  'user.error.emailRequired': 'Имэйл шаардлагатай.',
  'user.email.passwordResetSubject': '{{appName}} - Нууц үг шинэчлэх',
  'user.email.passwordResetText': 'Таны нууц үг шинэчлэх токен: {{token}}',
  'user.email.passwordResetLink': 'Нууц үгээ шинэчлэх: {{url}}',
  'user.email.passwordResetHtml': '<p>Таны нууц үг шинэчлэх токен: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Нууц үгээ шинэчлэх</a></p>',
  'user.error.failedToProcessPasswordReset': 'Нууц үг шинэчлэх процесс амжилтгүй.',
  'user.error.newPasswordRequired': 'Шинэ нууц үг шаардлагатай.',
  'user.error.currentPasswordRequired': 'Одоогийн нууц үг шаардлагатай.',
  'user.error.currentPasswordIncorrect': 'Одоогийн нууц үг буруу байна.',
  'user.error.failedToUpdatePassword': 'Нууц үг шинэчлэхэд алдаа гарлаа.',
  'user.error.planKeyRequired': 'planKey шаардлагатай.',
  'user.error.invalidPlan': 'Буруу төлөвлөгөө.',
  'user.error.failedToUpdateSubscription': 'Захиалга шинэчлэхэд алдаа гарлаа.',
  'user.error.failedToUpdatePlan': 'Төлөвлөгөө шинэчлэхэд алдаа гарлаа.',
  'user.error.twoFactorNotAvailable': 'Хоёр хүчин зүйлийн баталгаажуулалт боломжгүй.',
  'user.error.twoFactorRequiresPassword':
    'Энэ бүртгэлд хоёр хүчин зүйлийн баталгаажуулалт идэвхжсэн байна. Үргэлжлүүлэхийн тулд имэйл болон нууц үгээрээ нэвтэрнэ үү.',
  'user.error.tokenRequired': 'Токен шаардлагатай.',
  'user.error.noPendingTwoFactorSetup':
    'Хүлээгдэж буй хоёр хүчин зүйлийн тохиргоо байхгүй. Эхлээд "setup" үйлдлийг дуудна уу.',
  'user.error.invalidToken': 'Буруу токен.',
  'user.error.twoFactorRequired': 'Хоёр хүчин зүйлийн код шаардлагатай.',
  'user.error.twoFactorNotEnabled': 'Хоёр хүчин зүйлийн баталгаажуулалт идэвхжээгүй.',
  'user.error.invalidAction': 'Буруу үйлдэл. "setup", "enable", эсвэл "disable" ашиглана уу.',
  'user.error.twoFactorOperationFailed': 'Хоёр хүчин зүйлийн үйлдэл амжилтгүй.',
  'user.error.oauthServerNotConfigured': 'OAuth сервер "{{server}}" тохируулагдаагүй.',
  'user.error.oauthVerificationFailed': 'OAuth баталгаажуулалт амжилтгүй.',
  'user.error.failedToCreateUser': 'Хэрэглэгч үүсгэхэд алдаа гарлаа.',
  'user.error.oauthLoginFailed': 'OAuth нэвтрэлт амжилтгүй.',
  'user.error.unauthorized': 'Зөвшөөрөлгүй',
  'user.error.passwordTooLong': 'Нууц үг хамгийн ихдээ {{max}} тэмдэгтээс бүрдэх ёстой',
  'user.error.passwordTooShort': 'Нууц үг хамгийн багадаа {{min}} тэмдэгтээс бүрдэх ёстой',
  'user.error.tooManyRequests': 'Хэт олон оролдлого байна. Түр хүлээгээд дахин оролдоно уу.',
  'user.error.webhookUnauthorized': 'Зөвшөөрөлгүй төлбөрийн мэдэгдэл',
  'user.error.credentialsNested':
    'Энэ нэвтрэх төгсгөлийн цэг нь дээд түвшинд итгэмжлэлүүдийг уншдаг боловч энэ бие нь тэдгээрийг {{envelope}} дор байрлуулдаг. Энэ дугтуйг задлах маршрутад loginEndpoint-г тохируулна уу эсвэл handlers.logIn-ээс өмнө req.body[ {{envelope}}]-г задлахын тулд mapRequest-тэй хамт createRequestHandler-г ашиглана уу.',
  'user.error.oauthStateMismatch': 'OAuth төлөвийн зөрүү — CSRF халдлагад өртөх магадлалтай',
  'user.error.avatarTooLarge':
    'Аватар нь {{max}} тэмдэгтээс бүрдэх эсвэл түүнээс бага тэмдэгттэй байх ёстой.',
  'user.error.bioTooLong': 'Намтар нь {{max}} тэмдэгтээс бүрдэх ёстой.',
  'user.error.noUpdatableFields': 'Шинэчлэх боломжтой талбарууд өгөгдөөгүй байна.',
  'user.error.oauthDataInvalid': 'oauthData нь объект байх ёстой.',
  'user.error.subscriptionActivationRequiresVerification':
    'Захиалгыг идэвхжүүлэхийн тулд баримтын баталгаажуулалтыг хийх шаардлагатай — POST /users /:id/verify-payment/:provider ашиглана уу.',
  'user.payment.noBillingAccount': 'Энэ хэрэглэгчийн хувьд {{provider}} төлбөрийн данс олдсонгүй.',
  'user.payment.portalFailed': '{{provider}} төлбөрийн порталыг нээж чадсангүй.',
  'user.payment.portalNotSupported': '{{provider}} нь төлбөр тооцооны портал санал болгодоггүй.',
  'user.payment.subscriptionOwnershipMismatch': 'Энэ захиалга таны бүртгэлд хамаарахгүй.',
  'user.payment.transactionAlreadyClaimed':
    'Энэ худалдан авалт аль хэдийн өөр бүртгэлтэй холбогдсон байна.',
  'user.error.completeTargetMissing': 'completeId гэж өгөгдсөн ID-тай бүртгэл байхгүй байна.',
  'user.error.completeIdentityMismatch':
    'Өгөгдсөн хэрэглэгчийн нэр эсвэл имэйл нь бүрэн Id бүртгэлийг тодорхойлохгүй байна.',
  'user.error.completeNotOwned':
    'completeId бүртгэл нь OAuth-ээр нэвтэрдэг; түүний итгэмжлэлийг энд оруулаагүй болно.',
  'user.error.identityRequired':
    'Хангамжид бүртгэлийг тодорхойлохын тулд хэрэглэгчийн нэр эсвэл имэйл шаардлагатай.',
  'user.error.usernameEmailConflict':
    'Хэрэглэгчийн нэр болон имэйл нь хоёр өөр одоо байгаа бүртгэлд хамаарна.',
  'user.error.oauthEmailCollision':
    'Энэ имэйлд бүртгэл аль хэдийн байна. Анхны аргаар нэвтэрч ороод, дараа нь бүртгэлийн тохиргооноосоо энэ үйлчилгээ үзүүлэгчийг холбоно уу.',
}
