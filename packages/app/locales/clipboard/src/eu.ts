import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Basque. */
export const eu: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Ez da hornitzailerik ezarri. Deitu setProvider() ClipboardProvider inplementazio batekin (adib., @molecule/app-clipboard-react-native-etik).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange ez du hornitzaileak onartzen',
  'clipboard.error.missingDependency':
    '`{{library}}` beharrezkoa da baina ez dago instalatuta. Instalatu honekin: `npm install {{library}}`',
}
