import type { UserTranslations } from './types.js'

/** User translations for Khmer. */
export const km: UserTranslations = {
  'user.error.badRequest': 'សំណើមិនត្រឹមត្រូវ។',
  'user.error.notFound': 'រកមិនឃើញ។',
  'user.error.failedToCreateSession': 'បរាជ័យក្នុងការបង្កើត session។',
  'user.error.usernameRequired': 'ត្រូវការឈ្មោះអ្នកប្រើ។',
  'user.error.passwordRequired': 'ត្រូវការពាក្យសម្ងាត់។',
  'user.error.emailInvalid': 'អ៊ីមែលមិនត្រឹមត្រូវ។',
  'user.error.usernameUnavailable': 'ឈ្មោះអ្នកប្រើមិនអាចប្រើបាន។',
  'user.error.emailAlreadyRegistered': 'អ៊ីមែលបានចុះឈ្មោះរួចហើយ។',
  'user.error.failedToHashPassword': 'បរាជ័យក្នុងការ hash ពាក្យសម្ងាត់។',
  'user.error.invalidCredentials': 'អត្តសញ្ញាណមិនត្រឹមត្រូវ។',
  'user.error.invalidTwoFactorToken': 'Token two-factor មិនត្រឹមត្រូវ។',
  'user.error.twoFactorVerificationUnavailable': 'ការផ្ទៀងផ្ទាត់ two-factor មិនអាចប្រើបាន។',
  'user.error.loginFailed': 'ការចូលបរាជ័យ។',
  'user.notification.newLogin': 'ការចូលថ្មី',
  'user.notification.newLoginBody': 'ការចូលថ្មីពី {{deviceName}}។',
  'user.error.usernameCannotBeEmpty': 'ឈ្មោះអ្នកប្រើមិនអាចទទេ។',
  'user.error.usernameInvalid':
    'ឈ្មោះអ្នកប្រើអាចមានតែអក្សរ លេខ ចំណុច សញ្ញាដក និងសញ្ញាគូសក្រោមប៉ុណ្ណោះ។',
  'user.error.bodyNestedUnderUser':
    'សំណើនេះដាក់វាលរបស់វានៅក្រោម "user"; សូមផ្ញើឈ្មោះអ្នកប្រើ អ៊ីមែល និងពាក្យសម្ងាត់នៅកម្រិតខាងលើ។',
  'user.error.failedToUpdateUser': 'បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពអ្នកប្រើ។',
  'user.error.failedToDeleteUser': 'បរាជ័យក្នុងការលុបអ្នកប្រើ។',
  'user.error.failedToReadUser': 'បរាជ័យក្នុងការអានអ្នកប្រើ។',
  'user.error.emailRequired': 'ត្រូវការអ៊ីមែល។',
  'user.email.passwordResetSubject': '{{appName}} - កំណត់ពាក្យសម្ងាត់ឡើងវិញ',
  'user.email.passwordResetText': 'Token កំណត់ពាក្យសម្ងាត់ឡើងវិញរបស់អ្នកគឺ: {{token}}',
  'user.email.passwordResetLink': 'កំណត់ពាក្យសម្ងាត់ឡើងវិញនៅ: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Token កំណត់ពាក្យសម្ងាត់ឡើងវិញរបស់អ្នកគឺ: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">កំណត់ពាក្យសម្ងាត់ឡើងវិញ</a></p>',
  'user.error.failedToProcessPasswordReset': 'បរាជ័យក្នុងការដំណើរការកំណត់ពាក្យសម្ងាត់ឡើងវិញ។',
  'user.error.newPasswordRequired': 'ត្រូវការពាក្យសម្ងាត់ថ្មី។',
  'user.error.currentPasswordRequired': 'ត្រូវការពាក្យសម្ងាត់បច្ចុប្បន្ន។',
  'user.error.currentPasswordIncorrect': 'ពាក្យសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវ។',
  'user.error.failedToUpdatePassword': 'បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពពាក្យសម្ងាត់។',
  'user.error.planKeyRequired': 'ត្រូវការ planKey។',
  'user.error.invalidPlan': 'គម្រោងមិនត្រឹមត្រូវ។',
  'user.error.failedToUpdateSubscription': 'បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពការជាវ។',
  'user.error.failedToUpdatePlan': 'បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពគម្រោង។',
  'user.error.twoFactorNotAvailable': 'ការផ្ទៀងផ្ទាត់ two-factor មិនអាចប្រើបាន។',
  'user.error.twoFactorRequiresPassword':
    'ការផ្ទៀងផ្ទាត់ two-factor ត្រូវបានបើកនៅលើគណនីនេះ។ ចូលដោយប្រើអ៊ីមែល និងពាក្យសម្ងាត់របស់អ្នកដើម្បីបន្ត។',
  'user.error.tokenRequired': 'ត្រូវការ token។',
  'user.error.noPendingTwoFactorSetup':
    'គ្មានការដំឡើង two-factor កំពុងរង់ចាំ។ សូមហៅជាមួយ action "setup" ជាមុនសិន។',
  'user.error.invalidToken': 'Token មិនត្រឹមត្រូវ។',
  'user.error.twoFactorRequired': 'ត្រូវការកូដ two-factor។',
  'user.error.twoFactorNotEnabled': 'Two-factor មិនត្រូវបានបើក។',
  'user.error.invalidAction': 'Action មិនត្រឹមត្រូវ។ សូមប្រើ "setup", "enable", ឬ "disable"។',
  'user.error.twoFactorOperationFailed': 'ប្រតិបត្តិការ two-factor បរាជ័យ។',
  'user.error.oauthServerNotConfigured': 'OAuth server "{{server}}" មិនត្រូវបានកំណត់រចនាសម្ព័ន្ធ។',
  'user.error.oauthVerificationFailed': 'ការផ្ទៀងផ្ទាត់ OAuth បរាជ័យ។',
  'user.error.failedToCreateUser': 'បរាជ័យក្នុងការបង្កើតអ្នកប្រើ។',
  'user.error.oauthLoginFailed': 'ការចូល OAuth បរាជ័យ។',
  'user.error.unauthorized': 'គ្មានការអនុញ្ញាត',
  'user.error.passwordTooLong': 'ពាក្យសម្ងាត់ត្រូវតែមានតួអក្សរច្រើនបំផុត {{max}} តួអក្សរ',
  'user.error.passwordTooShort': 'ពាក្យសម្ងាត់ត្រូវតែមានយ៉ាងហោចណាស់ {{min}} តួអក្សរ',
  'user.error.tooManyRequests': 'ព្យាយាមច្រើនពេកហើយ។ សូមរង់ចាំ ហើយព្យាយាមម្តងទៀត។',
  'user.error.webhookUnauthorized': 'ការជូនដំណឹងអំពីការទូទាត់ដែលគ្មានការអនុញ្ញាត',
  'user.error.credentialsNested':
    'ចំណុចបញ្ចប់ការចូលប្រើនេះអានព័ត៌មានសម្ងាត់នៅកម្រិតកំពូល ប៉ុន្តែតួនេះដាក់ពួកវានៅក្រោម {{envelope}} ។ កំណត់ loginEndpoint ទៅផ្លូវដែលស្រាយស្រោមសំបុត្រនេះ ឬប្រើ createRequestHandler ជាមួយ mapRequest ដើម្បីស្រាយ req.body[ {{envelope}}] មុន handlers.logIn។',
  'user.error.oauthStateMismatch': 'ភាពមិនស៊ីគ្នានៃស្ថានភាព OAuth — ការវាយប្រហារ CSRF ដែលអាចកើតមាន',
  'user.error.avatarTooLarge': 'រូបតំណាងត្រូវតែមានតួអក្សរ {{max}} ឬតិចជាងនេះ។',
  'user.error.bioTooLong': 'ជីវប្រវត្តិត្រូវតែមានតួអក្សរ {{max}} ឬតិចជាងនេះ។',
  'user.error.noUpdatableFields':
    'គ្មាន​វាល​ដែល​អាច​ធ្វើ​បច្ចុប្បន្នភាព​បាន​ត្រូវ​បាន​ផ្តល់​ឲ្យ​ទេ។',
  'user.error.oauthDataInvalid': 'oauthData ត្រូវតែជាវត្ថុមួយ។',
  'user.error.subscriptionActivationRequiresVerification':
    'ការធ្វើឱ្យការជាវសកម្មត្រូវតែឆ្លងកាត់ការផ្ទៀងផ្ទាត់បង្កាន់ដៃ — ប្រើ POST /users /:id/verify-payment/:provider។',
  'user.payment.noBillingAccount': 'រកមិនឃើញគណនីគិតប្រាក់ {{provider}} សម្រាប់អ្នកប្រើប្រាស់នេះទេ។',
  'user.payment.portalFailed': 'មិនអាចបើកវិបផតថលវិក្កយបត្រ {{provider}} បានទេ។',
  'user.payment.portalNotSupported': '{{provider}} មិនផ្តល់ជូនវិបផតថលសម្រាប់គិតប្រាក់ទេ។',
  'user.payment.subscriptionOwnershipMismatch': 'ការជាវនេះមិនមែនជារបស់គណនីរបស់អ្នកទេ។',
  'user.payment.transactionAlreadyClaimed': 'ការទិញនេះត្រូវបានភ្ជាប់ជាមួយគណនីមួយផ្សេងទៀតរួចហើយ។',
  'user.error.completeTargetMissing': 'គ្មានគណនីដែលមានលេខសម្គាល់ដែលបានផ្គត់ផ្គង់ជា completeId ទេ។',
  'user.error.completeIdentityMismatch':
    'ឈ្មោះ​អ្នកប្រើប្រាស់ ឬអ៊ីមែល​ដែលបានផ្តល់​មិនកំណត់អត្តសញ្ញាណគណនី completeId ទេ។',
  'user.error.completeNotOwned':
    'គណនី completeId ចូលតាមរយៈ OAuth; ព័ត៌មានសម្គាល់របស់វាមិនត្រូវបានផ្តល់ជូននៅទីនេះទេ។',
  'user.error.identityRequired':
    'ការផ្តល់ត្រូវការឈ្មោះអ្នកប្រើប្រាស់ ឬអ៊ីមែល ដើម្បីកំណត់អត្តសញ្ញាណគណនី។',
  'user.error.usernameEmailConflict':
    'ឈ្មោះ​អ្នកប្រើប្រាស់ និង​អ៊ីមែល​នេះ​ជា​របស់​គណនី​ពីរ​ផ្សេង​គ្នា​ដែល​មាន​ស្រាប់។',
  'user.error.oauthEmailCollision':
    'មានគណនីមួយរួចហើយសម្រាប់អ៊ីមែលនេះ។ សូមចូលដោយប្រើវិធីសាស្ត្រដើមរបស់អ្នក បន្ទាប់មកភ្ជាប់អ្នកផ្តល់សេវានេះពីការកំណត់គណនីរបស់អ្នក។',
}
