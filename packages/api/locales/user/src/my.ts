import type { UserTranslations } from './types.js'

/** User translations for Burmese. */
export const my: UserTranslations = {
  'user.error.badRequest': 'တောင်းဆိုမှု မမှန်ကန်ပါ။',
  'user.error.notFound': 'ရှာမတွေ့ပါ။',
  'user.error.failedToCreateSession': 'Session ဖန်တီးရန် မအောင်မြင်ပါ။',
  'user.error.usernameRequired': 'အသုံးပြုသူအမည် လိုအပ်ပါသည်။',
  'user.error.passwordRequired': 'စကားဝှက် လိုအပ်ပါသည်။',
  'user.error.emailInvalid': 'အီးမေးလ် မမှန်ကန်ပါ။',
  'user.error.usernameUnavailable': 'အသုံးပြုသူအမည် မရရှိနိုင်ပါ။',
  'user.error.emailAlreadyRegistered': 'အီးမေးလ် မှတ်ပုံတင်ပြီးဖြစ်သည်။',
  'user.error.failedToHashPassword': 'စကားဝှက် hash လုပ်ရန် မအောင်မြင်ပါ။',
  'user.error.invalidCredentials': 'အထောက်အထားများ မမှန်ကန်ပါ။',
  'user.error.invalidTwoFactorToken': 'Two-factor token မမှန်ကန်ပါ။',
  'user.error.twoFactorVerificationUnavailable': 'Two-factor အတည်ပြုခြင်း မရရှိနိုင်ပါ။',
  'user.error.loginFailed': 'အကောင့်ဝင်ရန် မအောင်မြင်ပါ။',
  'user.notification.newLogin': 'အကောင့်ဝင်မှု အသစ်',
  'user.notification.newLoginBody': '{{deviceName}} မှ အကောင့်ဝင်မှု အသစ်။',
  'user.error.usernameCannotBeEmpty': 'အသုံးပြုသူအမည် ဗလာ မဖြစ်ရပါ။',
  'user.error.usernameInvalid':
    'အသုံးပြုသူအမည်တွင် စာလုံး၊ ဂဏန်း၊ အစက်၊ တုံးတို နှင့် အောက်မျဉ်းများသာ ပါဝင်နိုင်သည်။',
  'user.error.bodyNestedUnderUser':
    'ဤတောင်းဆိုချက်သည် ၎င်း၏အကွက်များကို "user" အောက်တွင် ထားသည်; အသုံးပြုသူအမည်၊ အီးမေးလ်နှင့် စကားဝှက်ကို အပေါ်ဆုံးအဆင့်တွင် ပို့ပါ။',
  'user.error.failedToUpdateUser': 'အသုံးပြုသူ အပ်ဒိတ်လုပ်ရန် မအောင်မြင်ပါ။',
  'user.error.failedToDeleteUser': 'အသုံးပြုသူ ဖျက်ရန် မအောင်မြင်ပါ။',
  'user.error.failedToReadUser': 'အသုံးပြုသူ ဖတ်ရန် မအောင်မြင်ပါ။',
  'user.error.emailRequired': 'အီးမေးလ် လိုအပ်ပါသည်။',
  'user.email.passwordResetSubject': '{{appName}} - စကားဝှက် ပြန်လည်သတ်မှတ်ခြင်း',
  'user.email.passwordResetText': 'သင့်စကားဝှက် ပြန်လည်သတ်မှတ်ရန် token မှာ: {{token}}',
  'user.email.passwordResetLink': 'သင့်စကားဝှက်ကို ပြန်လည်သတ်မှတ်ရန်: {{url}}',
  'user.email.passwordResetHtml':
    '<p>သင့်စကားဝှက် ပြန်လည်သတ်မှတ်ရန် token မှာ: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink':
    '<p><a href="{{url}}">သင့်စကားဝှက်ကို ပြန်လည်သတ်မှတ်ပါ</a></p>',
  'user.error.failedToProcessPasswordReset':
    'စကားဝှက် ပြန်လည်သတ်မှတ်ခြင်း လုပ်ဆောင်ရန် မအောင်မြင်ပါ။',
  'user.error.newPasswordRequired': 'စကားဝှက်အသစ် လိုအပ်ပါသည်။',
  'user.error.currentPasswordRequired': 'လက်ရှိ စကားဝှက် လိုအပ်ပါသည်။',
  'user.error.currentPasswordIncorrect': 'လက်ရှိ စကားဝှက် မှားနေသည်။',
  'user.error.failedToUpdatePassword': 'စကားဝှက် အပ်ဒိတ်လုပ်ရန် မအောင်မြင်ပါ။',
  'user.error.planKeyRequired': 'planKey လိုအပ်ပါသည်။',
  'user.error.invalidPlan': 'အစီအစဉ် မမှန်ကန်ပါ။',
  'user.error.failedToUpdateSubscription': 'စာရင်းသွင်းမှု အပ်ဒိတ်လုပ်ရန် မအောင်မြင်ပါ။',
  'user.error.failedToUpdatePlan': 'အစီအစဉ် အပ်ဒိတ်လုပ်ရန် မအောင်မြင်ပါ။',
  'user.error.twoFactorNotAvailable': 'Two-factor authentication မရရှိနိုင်ပါ။',
  'user.error.twoFactorRequiresPassword':
    'ဤအကောင့်တွင် two-factor authentication ဖွင့်ထားသည်။ ဆက်လက်လုပ်ဆောင်ရန် သင့်အီးမေးလ်နှင့် စကားဝှက်ဖြင့် ဝင်ရောက်ပါ။',
  'user.error.tokenRequired': 'Token လိုအပ်ပါသည်။',
  'user.error.noPendingTwoFactorSetup':
    'စောင့်ဆိုင်းနေသော two-factor setup မရှိပါ။ action "setup" ဖြင့် ဦးစွာ ခေါ်ပါ။',
  'user.error.invalidToken': 'Token မမှန်ကန်ပါ။',
  'user.error.twoFactorRequired': 'Two-factor ကုဒ် လိုအပ်ပါသည်။',
  'user.error.twoFactorNotEnabled': 'Two-factor ဖွင့်မထားပါ။',
  'user.error.invalidAction':
    'Action မမှန်ကန်ပါ။ "setup", "enable", သို့မဟုတ် "disable" ကို အသုံးပြုပါ။',
  'user.error.twoFactorOperationFailed': 'Two-factor လုပ်ဆောင်ချက် မအောင်မြင်ပါ။',
  'user.error.oauthServerNotConfigured': 'OAuth server "{{server}}" ပြင်ဆင်မထားပါ။',
  'user.error.oauthVerificationFailed': 'OAuth အတည်ပြုခြင်း မအောင်မြင်ပါ။',
  'user.error.failedToCreateUser': 'အသုံးပြုသူ ဖန်တီးရန် မအောင်မြင်ပါ။',
  'user.error.oauthLoginFailed': 'OAuth အကောင့်ဝင်ခြင်း မအောင်မြင်ပါ။',
  'user.error.unauthorized': 'ခွင့်ပြုချက်မရှိသော',
  'user.error.passwordTooLong': 'စကားဝှက်တွင် အများဆုံး စာလုံး {{max}} လုံး ပါဝင်ရမည်',
  'user.error.passwordTooShort': 'စကားဝှက်တွင် အနည်းဆုံး စာလုံး {{min}} ပါရှိရမည်',
  'user.error.tooManyRequests': 'ကြိုးစားမှု များလွန်းပါသည်။ ခဏစောင့်ပြီး ထပ်ကြိုးစားပါ။',
  'user.error.webhookUnauthorized': 'ခွင့်ပြုချက်မရှိသော ငွေပေးချေမှုအကြောင်းကြားစာ',
  'user.error.credentialsNested':
    'ဤ login endpoint သည် အပေါ်ဆုံးအဆင့်တွင် အထောက်အထားများကို ဖတ်ရှုသော်လည်း ဤ body သည် ၎င်းတို့ကို {{envelope}} အောက်တွင် ထည့်သွင်းထားသည်။ loginEndpoint ကို ဤစာအိတ်ကို ဖွင့်သည့် လမ်းကြောင်းသို့ သတ်မှတ်ပါ၊ သို့မဟုတ် handlers.logIn မတိုင်မီ req.body[ {{envelope}}] ကို ဖွင့်ရန် mapRequest နှင့်အတူ createRequestHandler ကို အသုံးပြုပါ။',
  'user.error.oauthStateMismatch': 'OAuth အခြေအနေ မကိုက်ညီမှု — CSRF တိုက်ခိုက်မှု ဖြစ်နိုင်သည်',
  'user.error.avatarTooLarge': 'ရုပ်ပုံတွင် စာလုံး {{max}} လုံး သို့မဟုတ် ထို့ထက်နည်းရမည်။',
  'user.error.bioTooLong': 'ကိုယ်ရေးအကျဉ်းတွင် စာလုံးရေ {{max}} လုံး သို့မဟုတ် ထို့ထက်နည်းရမည်။',
  'user.error.noUpdatableFields': 'အပ်ဒိတ်လုပ်နိုင်သော အကွက်များကို ပေးမထားပါ။',
  'user.error.oauthDataInvalid': 'oauthData သည် object တစ်ခု ဖြစ်ရမည်။',
  'user.error.subscriptionActivationRequiresVerification':
    'စာရင်းသွင်းမှုဖွင့်ခြင်းသည် ပြေစာအတည်ပြုခြင်းကို ဖြတ်သန်းရမည် — POST /users /:id/verify-payment/:provider ကို အသုံးပြုပါ။',
  'user.payment.noBillingAccount': 'ဤအသုံးပြုသူအတွက် {{provider}} ငွေတောင်းခံလွှာအကောင့် မတွေ့ပါ။',
  'user.payment.portalFailed': '{{provider}} ငွေတောင်းခံလွှာပို့သည့်ပေါ်တယ်ကို ဖွင့်၍မရပါ။',
  'user.payment.portalNotSupported': '{{provider}} ငွေတောင်းခံလွှာပို့သည့် ပေါ်တယ်ကို မပေးဆောင်ပါ။',
  'user.payment.subscriptionOwnershipMismatch': 'ဤစာရင်းသွင်းမှုသည် သင့်အကောင့်နှင့် မသက်ဆိုင်ပါ။',
  'user.payment.transactionAlreadyClaimed':
    'ဤဝယ်ယူမှုကို အခြားအကောင့်တစ်ခုနှင့် ချိတ်ဆက်ပြီးဖြစ်သည်။',
}
