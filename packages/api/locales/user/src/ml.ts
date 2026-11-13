import type { UserTranslations } from './types.js'

/** User translations for Malayalam. */
export const ml: UserTranslations = {
  'user.error.badRequest': 'മോശം അഭ്യർത്ഥന.',
  'user.error.notFound': 'കണ്ടെത്തിയില്ല.',
  'user.error.failedToCreateSession': 'സെഷൻ സൃഷ്‌ടിക്കുന്നതിൽ പരാജയപ്പെട്ടു.',
  'user.error.usernameRequired': 'ഉപയോക്തൃനാമം ആവശ്യമാണ്.',
  'user.error.passwordRequired': 'പാസ്‌വേഡ് ആവശ്യമാണ്.',
  'user.error.emailInvalid': 'ഇമെയിൽ അസാധുവാണ്.',
  'user.error.usernameUnavailable': 'ഉപയോക്തൃനാമം ലഭ്യമല്ല.',
  'user.error.emailAlreadyRegistered': 'ഇമെയിൽ ഇതിനകം രജിസ്റ്റർ ചെയ്തിട്ടുണ്ട്.',
  'user.error.failedToHashPassword': 'പാസ്‌വേഡ് ഹാഷ് ചെയ്യുന്നതിൽ പരാജയപ്പെട്ടു.',
  'user.error.invalidCredentials': 'അസാധുവായ ക്രെഡൻഷ്യലുകൾ.',
  'user.error.invalidTwoFactorToken': 'അസാധുവായ ടു-ഫാക്ടർ ടോക്കൺ.',
  'user.error.twoFactorVerificationUnavailable': 'ടു-ഫാക്ടർ സ്ഥിരീകരണം ലഭ്യമല്ല.',
  'user.error.loginFailed': 'ലോഗിൻ പരാജയപ്പെട്ടു.',
  'user.notification.newLogin': 'പുതിയ ലോഗിൻ',
  'user.notification.newLoginBody': '{{deviceName}} ൽ നിന്ന് പുതിയ ലോഗിൻ.',
  'user.error.usernameCannotBeEmpty': 'ഉപയോക്തൃനാമം ശൂന്യമാകരുത്.',
  'user.error.usernameInvalid':
    'ഉപയോക്തൃനാമത്തിൽ അക്ഷരങ്ങൾ, അക്കങ്ങൾ, കുത്തുകൾ, ഹൈഫനുകൾ, അണ്ടർസ്കോറുകൾ എന്നിവ മാത്രമേ ഉണ്ടാകാവൂ.',
  'user.error.bodyNestedUnderUser':
    'ഈ അഭ്യർത്ഥന അതിന്റെ ഫീൽഡുകൾ "user" ന് കീഴിൽ വയ്ക്കുന്നു; ഉപയോക്തൃനാമം, ഇമെയിൽ, പാസ്‌വേഡ് എന്നിവ മുകളിലെ തലത്തിൽ അയയ്ക്കുക.',
  'user.error.failedToUpdateUser': 'ഉപയോക്താവിനെ അപ്‌ഡേറ്റ് ചെയ്യുന്നതിൽ പരാജയപ്പെട്ടു.',
  'user.error.failedToDeleteUser': 'ഉപയോക്താവിനെ ഇല്ലാതാക്കുന്നതിൽ പരാജയപ്പെട്ടു.',
  'user.error.failedToReadUser': 'ഉപയോക്താവിനെ വായിക്കുന്നതിൽ പരാജയപ്പെട്ടു.',
  'user.error.emailRequired': 'ഇമെയിൽ ആവശ്യമാണ്.',
  'user.email.passwordResetSubject': '{{appName}} - പാസ്‌വേഡ് റീസെറ്റ്',
  'user.email.passwordResetText': 'നിങ്ങളുടെ പാസ്‌വേഡ് റീസെറ്റ് ടോക്കൺ: {{token}}',
  'user.email.passwordResetLink': 'ഇവിടെ നിങ്ങളുടെ പാസ്‌വേഡ് റീസെറ്റ് ചെയ്യുക: {{url}}',
  'user.email.passwordResetHtml':
    '<p>നിങ്ങളുടെ പാസ്‌വേഡ് റീസെറ്റ് ടോക്കൺ: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink':
    '<p><a href="{{url}}">നിങ്ങളുടെ പാസ്‌വേഡ് റീസെറ്റ് ചെയ്യുക</a></p>',
  'user.error.failedToProcessPasswordReset':
    'പാസ്‌വേഡ് റീസെറ്റ് പ്രോസസ്സ് ചെയ്യുന്നതിൽ പരാജയപ്പെട്ടു.',
  'user.error.newPasswordRequired': 'പുതിയ പാസ്‌വേഡ് ആവശ്യമാണ്.',
  'user.error.currentPasswordRequired': 'നിലവിലെ പാസ്‌വേഡ് ആവശ്യമാണ്.',
  'user.error.currentPasswordIncorrect': 'നിലവിലെ പാസ്‌വേഡ് തെറ്റാണ്.',
  'user.error.failedToUpdatePassword': 'പാസ്‌വേഡ് അപ്‌ഡേറ്റ് ചെയ്യുന്നതിൽ പരാജയപ്പെട്ടു.',
  'user.error.planKeyRequired': 'planKey ആവശ്യമാണ്.',
  'user.error.invalidPlan': 'അസാധുവായ പ്ലാൻ.',
  'user.error.failedToUpdateSubscription': 'സബ്‌സ്‌ക്രിപ്ഷൻ അപ്‌ഡേറ്റ് ചെയ്യുന്നതിൽ പരാജയപ്പെട്ടു.',
  'user.error.failedToUpdatePlan': 'പ്ലാൻ അപ്‌ഡേറ്റ് ചെയ്യുന്നതിൽ പരാജയപ്പെട്ടു.',
  'user.error.twoFactorNotAvailable': 'ടു-ഫാക്ടർ ഓതന്റിക്കേഷൻ ലഭ്യമല്ല.',
  'user.error.twoFactorRequiresPassword':
    'ഈ അക്കൗണ്ടിൽ ടു-ഫാക്ടർ ഓതന്റിക്കേഷൻ പ്രവർത്തനക്ഷമമാണ്. തുടരാൻ നിങ്ങളുടെ ഇമെയിലും പാസ്‌വേഡും ഉപയോഗിച്ച് സൈൻ ഇൻ ചെയ്യുക.',
  'user.error.tokenRequired': 'ടോക്കൺ ആവശ്യമാണ്.',
  'user.error.noPendingTwoFactorSetup':
    'തീർപ്പാകാത്ത ടു-ഫാക്ടർ സെറ്റപ്പ് ഇല്ല. ആദ്യം "setup" ആക്ഷൻ ഉപയോഗിച്ച് വിളിക്കുക.',
  'user.error.invalidToken': 'അസാധുവായ ടോക്കൺ.',
  'user.error.twoFactorRequired': 'ടു-ഫാക്ടർ കോഡ് ആവശ്യമാണ്.',
  'user.error.twoFactorNotEnabled': 'ടു-ഫാക്ടർ സജീവമല്ല.',
  'user.error.invalidAction':
    'അസാധുവായ ആക്ഷൻ. "setup", "enable", അല്ലെങ്കിൽ "disable" ഉപയോഗിക്കുക.',
  'user.error.twoFactorOperationFailed': 'ടു-ഫാക്ടർ ഓപ്പറേഷൻ പരാജയപ്പെട്ടു.',
  'user.error.oauthServerNotConfigured': 'OAuth സെർവർ "{{server}}" കോൺഫിഗർ ചെയ്തിട്ടില്ല.',
  'user.error.oauthVerificationFailed': 'OAuth സ്ഥിരീകരണം പരാജയപ്പെട്ടു.',
  'user.error.failedToCreateUser': 'ഉപയോക്താവിനെ സൃഷ്‌ടിക്കുന്നതിൽ പരാജയപ്പെട്ടു.',
  'user.error.oauthLoginFailed': 'OAuth ലോഗിൻ പരാജയപ്പെട്ടു.',
  'user.error.unauthorized': 'അംഗീകൃതമല്ലാത്തത്',
  'user.error.passwordTooLong': 'പാസ്‌വേഡിൽ പരമാവധി {{max}} പ്രതീകങ്ങൾ ഉണ്ടായിരിക്കണം.',
  'user.error.passwordTooShort': 'പാസ്‌വേഡിൽ കുറഞ്ഞത് {{min}} പ്രതീകങ്ങൾ ഉണ്ടായിരിക്കണം.',
  'user.error.tooManyRequests': 'വളരെയധികം ശ്രമങ്ങൾ. ദയവായി കാത്തിരുന്ന് വീണ്ടും ശ്രമിക്കുക.',
  'user.error.webhookUnauthorized': 'അനധികൃത പേയ്‌മെന്റ് അറിയിപ്പ്',
  'user.error.credentialsNested':
    'ഈ ലോഗിൻ എൻഡ്‌പോയിന്റ് മുകളിലെ തലത്തിൽ ക്രെഡൻഷ്യലുകൾ വായിക്കുന്നു, പക്ഷേ ഈ ബോഡി അവയെ {{envelope}} കീഴിൽ നെസ്റ്റ് ചെയ്യുന്നു. ഈ എൻവലപ്പ് അൺറാപ്പ് ചെയ്യുന്ന റൂട്ടിലേക്ക് loginEndpoint സജ്ജമാക്കുക, അല്ലെങ്കിൽ handlers.logIn-ന് മുമ്പ് req.body[ {{envelope}}] അൺറാപ്പ് ചെയ്യാൻ mapRequest ഉപയോഗിച്ച് createRequestHandler ഉപയോഗിക്കുക.',
  'user.error.oauthStateMismatch': 'OAuth സ്റ്റേറ്റ് പൊരുത്തക്കേട് — സാധ്യതയുള്ള CSRF ആക്രമണം',
  'user.error.avatarTooLarge': 'അവതാറിൽ {{max}} പ്രതീകങ്ങളോ അതിൽ കുറവോ ഉണ്ടായിരിക്കണം.',
  'user.error.bioTooLong': 'ബയോയിൽ {{max}} പ്രതീകങ്ങളോ അതിൽ കുറവോ ഉണ്ടായിരിക്കണം.',
  'user.error.noUpdatableFields': 'അപ്ഡേറ്റ് ചെയ്യാവുന്ന ഫീൽഡുകളൊന്നും നൽകിയിട്ടില്ല.',
  'user.error.oauthDataInvalid': 'oauthData ഒരു ഒബ്ജക്റ്റ് ആയിരിക്കണം.',
  'user.error.subscriptionActivationRequiresVerification':
    'സബ്‌സ്‌ക്രിപ്‌ഷൻ ആക്ടിവേഷൻ രസീത് പരിശോധനയിലൂടെ കടന്നുപോകണം — POST /users /:id/verify-payment/:provider ഉപയോഗിക്കുക.',
  'user.payment.noBillingAccount':
    'ഈ ഉപയോക്താവിന് {{provider}} ബില്ലിംഗ് അക്കൗണ്ട് കണ്ടെത്തിയില്ല.',
  'user.payment.portalFailed': '{{provider}} ബില്ലിംഗ് പോർട്ടൽ തുറക്കാൻ കഴിഞ്ഞില്ല.',
  'user.payment.portalNotSupported': '{{provider}} ഒരു ബില്ലിംഗ് പോർട്ടൽ വാഗ്ദാനം ചെയ്യുന്നില്ല.',
  'user.payment.subscriptionOwnershipMismatch': 'ഈ സബ്‌സ്‌ക്രിപ്‌ഷൻ നിങ്ങളുടെ അക്കൗണ്ടിന്റേതല്ല.',
  'user.payment.transactionAlreadyClaimed':
    'ഈ വാങ്ങൽ ഇതിനകം തന്നെ മറ്റൊരു അക്കൗണ്ടുമായി ബന്ധപ്പെട്ടിരിക്കുന്നു.',
}
