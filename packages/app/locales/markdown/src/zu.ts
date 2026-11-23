import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Zulu. */
export const zu: MarkdownTranslations = {
  'markdown.components.invalid':
    'I-components iqukethe okufakiwe okungeyona ingxenye ye-React noma igama le-element.',
  'markdown.components.unsupported':
    'Umhlinzeki we-marked akakwazi ukusebenzisa i-components, ngoba ubuyisela i-HTML string. Sebenzisa i-elementAttributes ukwengeza izimfanelo.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" akulona igama lesimfanelo (ku-<{{element}}>)',
  'markdown.elementAttributes.refused':
    'I-elementAttributes ayikwazi ukusetha "{{name}}" ku-<{{element}}>: umenzi wokubonisa ungumnikazi wayo',
  'markdown.elementAttributes.unknownElement':
    'I-elementAttributes ibiza i-<{{element}}>, engayikhi i-markdown',
  'markdown.footnotes.backToReference': 'Buyela emuva kureferensi {{reference}}',
  'markdown.footnotes.label': 'Imibhalo yaphansi',
}
