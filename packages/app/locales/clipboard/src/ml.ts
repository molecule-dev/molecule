import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Malayalam. */
export const ml: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: ദാതാവ് സജ്ജീകരിച്ചിട്ടില്ല. ഒരു ClipboardProvider ഇംപ്ലിമെന്റേഷനുമായി setProvider() വിളിക്കുക (ഉദാ., @molecule/app-clipboard-react-native-ൽ നിന്ന്).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange ദാതാവ് പിന്തുണയ്ക്കുന്നില്ല',
  'clipboard.error.missingDependency':
    '`{{library}}` ആവശ്യമാണ്, പക്ഷേ ഇൻസ്റ്റാൾ ചെയ്തിട്ടില്ല. `npm install {{library}}` ഉപയോഗിച്ച് ഇത് ഇൻസ്റ്റാൾ ചെയ്യുക.',
}
