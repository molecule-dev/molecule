import type { UserTranslations } from './types.js'

/** User translations for Tamil. */
export const ta: UserTranslations = {
  'user.error.badRequest': 'தவறான கோரிக்கை.',
  'user.error.notFound': 'கிடைக்கவில்லை.',
  'user.error.failedToCreateSession': 'அமர்வை உருவாக்க இயலவில்லை.',
  'user.error.usernameRequired': 'பயனர்பெயர் தேவை.',
  'user.error.passwordRequired': 'கடவுச்சொல் தேவை.',
  'user.error.emailInvalid': 'மின்னஞ்சல் தவறானது.',
  'user.error.usernameUnavailable': 'பயனர்பெயர் கிடைக்கவில்லை.',
  'user.error.emailAlreadyRegistered': 'மின்னஞ்சல் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது.',
  'user.error.failedToHashPassword': 'கடவுச்சொல்லை ஹாஷ் செய்ய இயலவில்லை.',
  'user.error.invalidCredentials': 'தவறான சான்றுகள்.',
  'user.error.invalidTwoFactorToken': 'தவறான இரு-காரணி டோக்கன்.',
  'user.error.twoFactorVerificationUnavailable': 'இரு-காரணி சரிபார்ப்பு கிடைக்கவில்லை.',
  'user.error.loginFailed': 'உள்நுழைவு தோல்வி.',
  'user.notification.newLogin': 'புதிய உள்நுழைவு',
  'user.notification.newLoginBody': '{{deviceName}} இலிருந்து புதிய உள்நுழைவு.',
  'user.error.usernameCannotBeEmpty': 'பயனர்பெயர் காலியாக இருக்கக்கூடாது.',
  'user.error.usernameInvalid':
    'பயனர் பெயரில் எழுத்துகள், எண்கள், புள்ளிகள், இணைப்புக்குறிகள் மற்றும் அடிக்கோடுகள் மட்டுமே இருக்கலாம்.',
  'user.error.bodyNestedUnderUser':
    'இந்தக் கோரிக்கை அதன் புலங்களை "user" கீழ் வைக்கிறது; பயனர் பெயர், மின்னஞ்சல், கடவுச்சொல்லை மேல் நிலையில் அனுப்பவும்.',
  'user.error.failedToUpdateUser': 'பயனரைப் புதுப்பிக்க இயலவில்லை.',
  'user.error.failedToDeleteUser': 'பயனரை நீக்க இயலவில்லை.',
  'user.error.failedToReadUser': 'பயனரைப் படிக்க இயலவில்லை.',
  'user.error.emailRequired': 'மின்னஞ்சல் தேவை.',
  'user.email.passwordResetSubject': '{{appName}} - கடவுச்சொல் மீட்டமைப்பு',
  'user.email.passwordResetText': 'உங்கள் கடவுச்சொல் மீட்டமைப்பு டோக்கன்: {{token}}',
  'user.email.passwordResetLink': 'இங்கே உங்கள் கடவுச்சொல்லை மீட்டமைக்கவும்: {{url}}',
  'user.email.passwordResetHtml':
    '<p>உங்கள் கடவுச்சொல் மீட்டமைப்பு டோக்கன்: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink':
    '<p><a href="{{url}}">உங்கள் கடவுச்சொல்லை மீட்டமைக்கவும்</a></p>',
  'user.error.failedToProcessPasswordReset': 'கடவுச்சொல் மீட்டமைப்பு செயலாக்கத்தில் தோல்வி.',
  'user.error.newPasswordRequired': 'புதிய கடவுச்சொல் தேவை.',
  'user.error.currentPasswordRequired': 'தற்போதைய கடவுச்சொல் தேவை.',
  'user.error.currentPasswordIncorrect': 'தற்போதைய கடவுச்சொல் தவறானது.',
  'user.error.failedToUpdatePassword': 'கடவுச்சொல்லைப் புதுப்பிக்க இயலவில்லை.',
  'user.error.planKeyRequired': 'planKey தேவை.',
  'user.error.invalidPlan': 'தவறான திட்டம்.',
  'user.error.failedToUpdateSubscription': 'சந்தாவைப் புதுப்பிக்க இயலவில்லை.',
  'user.error.failedToUpdatePlan': 'திட்டத்தைப் புதுப்பிக்க இயலவில்லை.',
  'user.error.twoFactorNotAvailable': 'இரு-காரணி அங்கீகாரம் கிடைக்கவில்லை.',
  'user.error.twoFactorRequiresPassword':
    'இந்தக் கணக்கில் இரு-காரணி அங்கீகாரம் இயக்கப்பட்டுள்ளது. தொடர உங்கள் மின்னஞ்சல் மற்றும் கடவுச்சொல்லுடன் உள்நுழையவும்.',
  'user.error.tokenRequired': 'டோக்கன் தேவை.',
  'user.error.noPendingTwoFactorSetup':
    'நிலுவையில் இரு-காரணி அமைப்பு இல்லை. முதலில் "setup" செயலுடன் அழைக்கவும்.',
  'user.error.invalidToken': 'தவறான டோக்கன்.',
  'user.error.twoFactorRequired': 'இரு-காரணி குறியீடு தேவை.',
  'user.error.twoFactorNotEnabled': 'இரு-காரணி இயக்கப்படவில்லை.',
  'user.error.invalidAction': 'தவறான செயல். "setup", "enable", அல்லது "disable" பயன்படுத்தவும்.',
  'user.error.twoFactorOperationFailed': 'இரு-காரணி செயல்பாடு தோல்வி.',
  'user.error.oauthServerNotConfigured': 'OAuth சேவையகம் "{{server}}" கட்டமைக்கப்படவில்லை.',
  'user.error.oauthVerificationFailed': 'OAuth சரிபார்ப்பு தோல்வி.',
  'user.error.failedToCreateUser': 'பயனரை உருவாக்க இயலவில்லை.',
  'user.error.oauthLoginFailed': 'OAuth உள்நுழைவு தோல்வி.',
  'user.error.unauthorized': 'அங்கீகரிக்கப்படாத',
  'user.error.passwordTooLong': 'கடவுச்சொல் அதிகபட்சம் {{max}} எழுத்துகள் கொண்டிருக்க வேண்டும்.',
  'user.error.passwordTooShort': 'கடவுச்சொல் குறைந்தபட்சம் {{min}} எழுத்துகள் கொண்டிருக்க வேண்டும்',
  'user.error.tooManyRequests':
    'பலமுறை முயற்சித்துவிட்டீர்கள். தயவுசெய்து காத்திருந்து மீண்டும் முயற்சிக்கவும்.',
  'user.error.webhookUnauthorized': 'அங்கீகரிக்கப்படாத கட்டண அறிவிப்பு',
  'user.error.credentialsNested':
    'இந்த லாகின் எண்ட்பாயிண்ட் மேல் மட்டத்தில் நற்சான்றிதழ்களைப் படிக்கிறது, ஆனால் இந்த பாடி அவற்றை {{envelope}} க்குள் உள்ளடக்கியுள்ளது. இந்த என்வலப்பை அவிழ்க்கும் ரூட்டிற்கு loginEndpoint-ஐ அமைக்கவும், அல்லது handlers.logIn-க்கு முன்பு req.body[ {{envelope}}]-ஐ அவிழ்க்க, mapRequest உடன் createRequestHandler-ஐப் பயன்படுத்தவும்.',
  'user.error.oauthStateMismatch': 'OAuth நிலை பொருந்தாமை — CSRF தாக்குதலுக்கான சாத்தியம்',
  'user.error.avatarTooLarge': 'அவதார் {{max}} எழுத்துகள் அல்லது அதற்கும் குறைவாக இருக்க வேண்டும்.',
  'user.error.bioTooLong': 'சுயவிவரம் {{max}} எழுத்துகள் அல்லது அதற்கும் குறைவாக இருக்க வேண்டும்.',
  'user.error.noUpdatableFields': 'புதுப்பிக்கக்கூடிய புலங்கள் எதுவும் வழங்கப்படவில்லை.',
  'user.error.oauthDataInvalid': 'oauthData ஒரு ஆப்ஜெக்ட்டாக இருக்க வேண்டும்.',
  'user.error.subscriptionActivationRequiresVerification':
    'சந்தா செயல்படுத்தல் ரசீது சரிபார்ப்பு மூலம் நடைபெற வேண்டும் — இதற்கு POST /users /:id/verify-payment/:provider கட்டளையைப் பயன்படுத்தவும்.',
  'user.payment.noBillingAccount':
    'இந்தப் பயனருக்கு எந்த {{provider}} கட்டணக் கணக்கும் காணப்படவில்லை.',
  'user.payment.portalFailed': '{{provider}} கட்டண இணையதளத்தைத் திறக்க முடியவில்லை.',
  'user.payment.portalNotSupported': '{{provider}} கட்டணப் பட்டியல் தளத்தை வழங்குவதில்லை.',
  'user.payment.subscriptionOwnershipMismatch': 'இந்தச் சந்தா உங்கள் கணக்கிற்குச் சொந்தமானது அல்ல.',
  'user.payment.transactionAlreadyClaimed':
    'இந்தக் கொள்முதல் ஏற்கனவே மற்றொரு கணக்குடன் இணைக்கப்பட்டுள்ளது.',
  'user.error.completeTargetMissing': 'completeId ஆக வழங்கப்பட்ட ஐடியுடன் எந்தக் கணக்கும் இல்லை.',
  'user.error.completeIdentityMismatch':
    'வழங்கப்பட்ட பயனர்பெயர் அல்லது மின்னஞ்சல், completeId கணக்கை அடையாளம் காட்டவில்லை.',
  'user.error.completeNotOwned':
    'completeId கணக்கு OAuth வழியாக உள்நுழைகிறது; அதன் நற்சான்றுகள் இங்கு வழங்கப்படவில்லை.',
  'user.error.identityRequired':
    'கணக்கை அடையாளம் காண, வழங்குவதற்கு ஒரு பயனர்பெயர் அல்லது மின்னஞ்சல் தேவைப்படுகிறது.',
  'user.error.usernameEmailConflict':
    'பயனர்பெயரும் மின்னஞ்சலும் ஏற்கனவே உள்ள இரண்டு வெவ்வேறு கணக்குகளுக்கு உரியவை.',
  'user.error.oauthEmailCollision':
    'இந்த மின்னஞ்சலுக்கு ஏற்கனவே ஒரு கணக்கு உள்ளது. தயவுசெய்து உங்கள் அசல் முறையைப் பயன்படுத்தி உள்நுழைந்து, பின்னர் உங்கள் கணக்கு அமைப்புகளிலிருந்து இந்த வழங்குநரை இணைக்கவும்.',
}
