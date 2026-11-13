import type { UserTranslations } from './types.js'

/** User translations for Persian. */
export const fa: UserTranslations = {
  'user.error.badRequest': 'درخواست نامعتبر.',
  'user.error.notFound': 'یافت نشد.',
  'user.error.failedToCreateSession': 'ایجاد نشست ناموفق بود.',
  'user.error.usernameRequired': 'نام کاربری الزامی است.',
  'user.error.passwordRequired': 'رمز عبور الزامی است.',
  'user.error.emailInvalid': 'ایمیل نامعتبر است.',
  'user.error.usernameUnavailable': 'نام کاربری در دسترس نیست.',
  'user.error.emailAlreadyRegistered': 'ایمیل قبلاً ثبت شده است.',
  'user.error.failedToHashPassword': 'هش کردن رمز عبور ناموفق بود.',
  'user.error.invalidCredentials': 'اعتبارنامه‌های نامعتبر.',
  'user.error.invalidTwoFactorToken': 'توکن دو مرحله‌ای نامعتبر.',
  'user.error.twoFactorVerificationUnavailable': 'تأیید دو مرحله‌ای در دسترس نیست.',
  'user.error.loginFailed': 'ورود ناموفق بود.',
  'user.notification.newLogin': 'ورود جدید',
  'user.notification.newLoginBody': 'ورود جدید از {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'نام کاربری نمی‌تواند خالی باشد.',
  'user.error.usernameInvalid':
    'نام کاربری فقط می‌تواند شامل حروف، اعداد، نقطه، خط تیره و زیرخط باشد.',
  'user.error.bodyNestedUnderUser':
    'این درخواست فیلدهای خود را زیر "user" قرار می‌دهد؛ نام کاربری، ایمیل و رمز عبور را در سطح بالا بفرستید.',
  'user.error.failedToUpdateUser': 'به‌روزرسانی کاربر ناموفق بود.',
  'user.error.failedToDeleteUser': 'حذف کاربر ناموفق بود.',
  'user.error.failedToReadUser': 'خواندن کاربر ناموفق بود.',
  'user.error.emailRequired': 'ایمیل الزامی است.',
  'user.email.passwordResetSubject': '{{appName}} - بازنشانی رمز عبور',
  'user.email.passwordResetText': 'توکن بازنشانی رمز عبور شما: {{token}}',
  'user.email.passwordResetLink': 'رمز عبور خود را در این آدرس بازنشانی کنید: {{url}}',
  'user.email.passwordResetHtml': '<p>توکن بازنشانی رمز عبور شما: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">بازنشانی رمز عبور</a></p>',
  'user.error.failedToProcessPasswordReset': 'پردازش بازنشانی رمز عبور ناموفق بود.',
  'user.error.newPasswordRequired': 'رمز عبور جدید الزامی است.',
  'user.error.currentPasswordRequired': 'رمز عبور فعلی الزامی است.',
  'user.error.currentPasswordIncorrect': 'رمز عبور فعلی نادرست است.',
  'user.error.failedToUpdatePassword': 'به‌روزرسانی رمز عبور ناموفق بود.',
  'user.error.planKeyRequired': 'planKey الزامی است.',
  'user.error.invalidPlan': 'طرح نامعتبر.',
  'user.error.failedToUpdateSubscription': 'به‌روزرسانی اشتراک ناموفق بود.',
  'user.error.failedToUpdatePlan': 'به‌روزرسانی طرح ناموفق بود.',
  'user.error.twoFactorNotAvailable': 'احراز هویت دو مرحله‌ای در دسترس نیست.',
  'user.error.twoFactorRequiresPassword':
    'احراز هویت دو مرحله‌ای در این حساب فعال است. برای ادامه با ایمیل و رمز عبور خود وارد شوید.',
  'user.error.tokenRequired': 'توکن الزامی است.',
  'user.error.noPendingTwoFactorSetup':
    'تنظیم دو مرحله‌ای در انتظاری وجود ندارد. ابتدا با "setup" فراخوانی کنید.',
  'user.error.invalidToken': 'توکن نامعتبر.',
  'user.error.twoFactorRequired': 'کد دو مرحله‌ای الزامی است.',
  'user.error.twoFactorNotEnabled': 'دو مرحله‌ای فعال نیست.',
  'user.error.invalidAction': 'عملیات نامعتبر. از "setup"، "enable" یا "disable" استفاده کنید.',
  'user.error.twoFactorOperationFailed': 'عملیات دو مرحله‌ای ناموفق بود.',
  'user.error.oauthServerNotConfigured': 'سرور OAuth "{{server}}" پیکربندی نشده است.',
  'user.error.oauthVerificationFailed': 'تأیید OAuth ناموفق بود.',
  'user.error.failedToCreateUser': 'ایجاد کاربر ناموفق بود.',
  'user.error.oauthLoginFailed': 'ورود OAuth ناموفق بود.',
  'user.error.unauthorized': 'غیرمجاز',
  'user.error.passwordTooLong': 'رمز عبور باید حداکثر {{max}} کاراکتر باشد',
  'user.error.passwordTooShort': 'رمز عبور باید حداقل {{min}} کاراکتر باشد',
  'user.error.tooManyRequests':
    'تعداد دفعات تلاش خیلی زیاد است. لطفاً صبر کنید و دوباره امتحان کنید.',
  'user.error.webhookUnauthorized': 'هشدار پرداخت غیرمجاز',
  'user.error.credentialsNested':
    'این نقطه پایانی ورود، اطلاعات احراز هویت را در سطح بالا می‌خواند، اما این بدنه آنها را در زیر {{envelope}} قرار می‌دهد. loginEndpoint را روی مسیری که این پاکت را باز می‌کند تنظیم کنید، یا از createRequestHandler به همراه mapRequest برای باز کردن req.body[ {{envelope}}] قبل از handlers.logIn استفاده کنید.',
  'user.error.oauthStateMismatch': 'عدم تطابق وضعیت OAuth - حمله CSRF احتمالی',
  'user.error.avatarTooLarge': 'آواتار باید {{max}} کاراکتر یا کمتر باشد.',
  'user.error.bioTooLong': 'بیوگرافی باید {{max}} کاراکتر یا کمتر باشد.',
  'user.error.noUpdatableFields': 'هیچ فیلد قابل به‌روزرسانی ارائه نشده است.',
  'user.error.oauthDataInvalid': 'oauthData باید یک شیء باشد.',
  'user.error.subscriptionActivationRequiresVerification':
    'فعال‌سازی اشتراک باید از طریق تأیید رسید انجام شود — از POST /users /:id/verify-payment/:provider استفاده کنید.',
  'user.payment.noBillingAccount': 'هیچ حساب پرداختی {{provider}} برای این کاربر یافت نشد.',
  'user.payment.portalFailed': 'نتوانستم پورتال صورتحساب {{provider}} را باز کنم.',
  'user.payment.portalNotSupported': '{{provider}} درگاه پرداخت ارائه نمی‌دهد.',
  'user.payment.subscriptionOwnershipMismatch': 'این اشتراک به حساب شما تعلق ندارد.',
  'user.payment.transactionAlreadyClaimed': 'این خرید قبلاً با حساب دیگری مرتبط است.',
  'user.error.completeTargetMissing':
    'هیچ حسابی با شناسه‌ی ارائه شده به عنوان completeId وجود ندارد.',
  'user.error.completeIdentityMismatch':
    'نام کاربری یا ایمیل ارائه شده، حساب completeId را شناسایی نمی‌کند.',
  'user.error.completeNotOwned':
    'حساب completeId از طریق OAuth وارد سیستم می‌شود؛ اعتبارنامه‌های آن در اینجا ارائه نشده است.',
  'user.error.identityRequired':
    'تأمین منابع برای شناسایی حساب به یک نام کاربری یا ایمیل نیاز دارد.',
  'user.error.usernameEmailConflict': 'نام کاربری و ایمیل متعلق به دو حساب کاربری مختلف هستند.',
  'user.error.oauthEmailCollision':
    'یک حساب کاربری از قبل برای این ایمیل وجود دارد. لطفاً با روش اصلی خود وارد شوید، سپس این ارائه دهنده را از تنظیمات حساب خود پیوند دهید.',
}
