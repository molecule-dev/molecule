import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Tamil. */
export const ta: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: வழங்குநர் அமைக்கப்படவில்லை. ClipboardProvider செயலாக்கத்துடன் setProvider() ஐ அழைக்கவும் (எ.கா., @molecule/app-clipboard-react-native இலிருந்து).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange வழங்குநரால் ஆதரிக்கப்படவில்லை',
  'clipboard.error.missingDependency':
    '`{{library}}` தேவைப்படுகிறது, ஆனால் நிறுவப்படவில்லை. இதை `npm install {{library}}` கொண்டு நிறுவவும்.',
}
