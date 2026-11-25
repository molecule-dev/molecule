import type { PushTranslations } from './types.js'

/** Push translations for Malayalam. */
export const ml: PushTranslations = {
  'push.error.notSupported': 'പുഷ് അറിയിപ്പുകൾ പിന്തുണയ്ക്കുന്നില്ല',
  'push.error.permissionNotGranted': 'അറിയിപ്പ് അനുമതി നൽകിയിട്ടില്ല',
  'push.error.missingDependency':
    '`{{library}}` ആവശ്യമാണ്, പക്ഷേ ഇൻസ്റ്റാൾ ചെയ്തിട്ടില്ല. `npx expo install {{library}}` ഉപയോഗിച്ച് ഇത് ഇൻസ്റ്റാൾ ചെയ്യുക.',
  'push.error.noServiceWorker':
    'service worker ഒന്നും രജിസ്റ്റർ ചെയ്തിട്ടില്ല. പുഷ് അറിയിപ്പുകൾക്ക് @molecule/app-pwa-default ഇൻസ്റ്റാൾ ചെയ്ത ആപ്പിന്റെ പ്രൊഡക്ഷൻ ബിൽഡ് ആവശ്യമാണ്.',
}
