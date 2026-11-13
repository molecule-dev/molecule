import type { UserTranslations } from './types.js'

/** User translations for Uzbek. */
export const uz: UserTranslations = {
  'user.error.badRequest': "Noto'g'ri so'rov.",
  'user.error.notFound': 'Topilmadi.',
  'user.error.failedToCreateSession': "Sessiya yaratib bo'lmadi.",
  'user.error.usernameRequired': 'Foydalanuvchi nomi talab qilinadi.',
  'user.error.passwordRequired': 'Parol talab qilinadi.',
  'user.error.emailInvalid': "Email noto'g'ri.",
  'user.error.usernameUnavailable': 'Foydalanuvchi nomi mavjud emas.',
  'user.error.emailAlreadyRegistered': "Email allaqachon ro'yxatdan o'tgan.",
  'user.error.failedToHashPassword': "Parolni xeshlash muvaffaqiyatsiz bo'ldi.",
  'user.error.invalidCredentials': "Noto'g'ri hisob ma'lumotlari.",
  'user.error.invalidTwoFactorToken': "Noto'g'ri ikki bosqichli token.",
  'user.error.twoFactorVerificationUnavailable': 'Ikki bosqichli tekshirish mavjud emas.',
  'user.error.loginFailed': "Kirish muvaffaqiyatsiz bo'ldi.",
  'user.notification.newLogin': 'Yangi kirish',
  'user.notification.newLoginBody': '{{deviceName}} qurilmasidan yangi kirish.',
  'user.error.usernameCannotBeEmpty': "Foydalanuvchi nomi bo'sh bo'lishi mumkin emas.",
  'user.error.usernameInvalid':
    'Foydalanuvchi nomida faqat harflar, raqamlar, nuqtalar, chiziqchalar va pastki chiziqlar boʻlishi mumkin.',
  'user.error.bodyNestedUnderUser':
    'Bu soʻrov maydonlarini "user" ichiga joylaydi; foydalanuvchi nomi, email va parolni yuqori darajada yuboring.',
  'user.error.failedToUpdateUser': "Foydalanuvchini yangilab bo'lmadi.",
  'user.error.failedToDeleteUser': "Foydalanuvchini o'chirib bo'lmadi.",
  'user.error.failedToReadUser': "Foydalanuvchini o'qib bo'lmadi.",
  'user.error.emailRequired': 'Email talab qilinadi.',
  'user.email.passwordResetSubject': '{{appName}} - Parolni tiklash',
  'user.email.passwordResetText': 'Parolni tiklash tokeningiz: {{token}}',
  'user.email.passwordResetLink': 'Parolingizni bu yerda tiklang: {{url}}',
  'user.email.passwordResetHtml': '<p>Parolni tiklash tokeningiz: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Parolingizni tiklang</a></p>',
  'user.error.failedToProcessPasswordReset': "Parolni tiklash jarayoni muvaffaqiyatsiz bo'ldi.",
  'user.error.newPasswordRequired': 'Yangi parol talab qilinadi.',
  'user.error.currentPasswordRequired': 'Joriy parol talab qilinadi.',
  'user.error.currentPasswordIncorrect': "Joriy parol noto'g'ri.",
  'user.error.failedToUpdatePassword': "Parolni yangilab bo'lmadi.",
  'user.error.planKeyRequired': 'planKey talab qilinadi.',
  'user.error.invalidPlan': "Noto'g'ri reja.",
  'user.error.failedToUpdateSubscription': "Obunani yangilab bo'lmadi.",
  'user.error.failedToUpdatePlan': "Rejani yangilab bo'lmadi.",
  'user.error.twoFactorNotAvailable': 'Ikki bosqichli autentifikatsiya mavjud emas.',
  'user.error.twoFactorRequiresPassword':
    'Ushbu hisobda ikki bosqichli autentifikatsiya yoqilgan. Davom etish uchun email va parolingiz bilan kiring.',
  'user.error.tokenRequired': 'Token talab qilinadi.',
  'user.error.noPendingTwoFactorSetup':
    'Kutilayotgan ikki bosqichli sozlash yo\'q. Avval "setup" bilan chaqiring.',
  'user.error.invalidToken': "Noto'g'ri token.",
  'user.error.twoFactorRequired': 'Ikki bosqichli kod talab qilinadi.',
  'user.error.twoFactorNotEnabled': 'Ikki bosqichli yoqilmagan.',
  'user.error.invalidAction': 'Noto\'g\'ri amal. "setup", "enable" yoki "disable" dan foydalaning.',
  'user.error.twoFactorOperationFailed': "Ikki bosqichli operatsiya muvaffaqiyatsiz bo'ldi.",
  'user.error.oauthServerNotConfigured': 'OAuth serveri "{{server}}" sozlanmagan.',
  'user.error.oauthVerificationFailed': "OAuth tekshiruvi muvaffaqiyatsiz bo'ldi.",
  'user.error.failedToCreateUser': "Foydalanuvchini yaratib bo'lmadi.",
  'user.error.oauthLoginFailed': "OAuth kirish muvaffaqiyatsiz bo'ldi.",
  'user.error.unauthorized': 'Ruxsatsiz',
  'user.error.passwordTooLong': "Parol eng ko'pi bilan {{max}} ta belgidan iborat bo'lishi kerak",
  'user.error.passwordTooShort': "Parol kamida {{min}} ta belgidan iborat bo'lishi kerak",
  'user.error.tooManyRequests': "Juda ko'p urinishlar. Iltimos, kuting va qaytadan urinib ko'ring.",
  'user.error.webhookUnauthorized': 'Ruxsatsiz toʻlov haqida bildirishnoma',
  'user.error.credentialsNested':
    "Ushbu kirish nuqtasi yuqori darajadagi hisob ma'lumotlarini o'qiydi, lekin bu tana ularni {{envelope}} ostida joylashtiradi. Ushbu konvertni ochadigan marshrutga loginEndpoint ni o'rnating yoki handlers.logIn dan oldin req.body[ {{envelope}}] ni ochish uchun mapRequest bilan createRequestHandler dan foydalaning.",
  'user.error.oauthStateMismatch': "OAuth holati mos kelmasligi — mumkin bo'lgan CSRF hujumi",
  'user.error.avatarTooLarge': "Avatar {{max}} yoki undan kam belgidan iborat bo'lishi kerak.",
  'user.error.bioTooLong': "Biografiya {{max}} yoki undan kam belgidan iborat bo'lishi kerak.",
  'user.error.noUpdatableFields': 'Yangilanadigan maydonlar taqdim etilmagan.',
  'user.error.oauthDataInvalid': "oauthData obyekt bo'lishi kerak.",
  'user.error.subscriptionActivationRequiresVerification':
    'Obunani faollashtirish uchun chekni tekshirish kerak — POST /users /:id/verify-payment/:provider dan foydalaning.',
  'user.payment.noBillingAccount': 'Bu foydalanuvchi uchun {{provider}} toʻlov hisobi topilmadi.',
  'user.payment.portalFailed': '{{provider}} toʻlov portalini ochib boʻlmadi.',
  'user.payment.portalNotSupported': '{{provider}} billing portalini taklif qilmaydi.',
  'user.payment.subscriptionOwnershipMismatch': 'Bu obuna sizning hisobingizga tegishli emas.',
  'user.payment.transactionAlreadyClaimed': "Bu xarid allaqachon boshqa hisob bilan bog'langan.",
  'user.error.completeTargetMissing':
    'completeId sifatida berilgan identifikator bilan hech qanday hisob mavjud emas.',
  'user.error.completeIdentityMismatch':
    "Berilgan foydalanuvchi nomi yoki elektron pochta manzili to'liq ID hisobini aniqlamaydi.",
  'user.error.completeNotOwned':
    "completeId hisobi OAuth orqali tizimga kiradi; uning hisob ma'lumotlari bu yerda taqdim etilmaydi.",
  'user.error.identityRequired':
    'Hisobni aniqlash uchun foydalanuvchi nomi yoki elektron pochta manzili kerak.',
  'user.error.usernameEmailConflict':
    'Foydalanuvchi nomi va elektron pochta manzili ikkita mavjud hisobga tegishli.',
  'user.error.oauthEmailCollision':
    "Ushbu elektron pochta uchun hisob allaqachon mavjud. Iltimos, asl usulingiz bilan tizimga kiring, so'ngra hisob sozlamalaringizdan ushbu provayderni ulang.",
}
