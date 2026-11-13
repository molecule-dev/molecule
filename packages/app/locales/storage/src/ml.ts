import type { StorageTranslations } from './types.js'

/** Storage translations for Malayalam. */
export const ml: StorageTranslations = {
  'storage.error.noProvider':
    'സ്റ്റോറേജ് പ്രൊവൈഡർ ക്രമീകരിച്ചിട്ടില്ല. ആദ്യം setProvider() വിളിക്കുക.',
  'storage.error.quotaExceeded': '"{{key}}" കീ സജ്ജമാക്കുമ്പോൾ സ്റ്റോറേജ് ക്വോട്ട കവിഞ്ഞു',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` ഇൻസ്റ്റാൾ ചെയ്തിട്ടില്ല. `npm install @react-native-async-storage/async-storage` ഉപയോഗിച്ച് ഇത് ഇൻസ്റ്റാൾ ചെയ്യുക.',
  'storage.error.setFailed':
    'AsyncStorage-ൽ " {{key}} " കീയ്‌ക്ക് മൂല്യം സജ്ജമാക്കുന്നതിൽ പരാജയപ്പെട്ടു.',
}
