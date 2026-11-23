import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Welsh. */
export const cy: MarkdownTranslations = {
  'markdown.components.invalid':
    "Mae components yn cynnwys cofnod nad yw'n gydran React nac yn enw elfen.",
  'markdown.components.unsupported':
    'Ni all y darparwr marked ddefnyddio components, oherwydd ei fod yn dychwelyd llinyn HTML. Defnyddiwch elementAttributes i ychwanegu priodoleddau.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" nid yw\'n enw priodoledd (ar <{{element}}>)',
  'markdown.elementAttributes.refused':
    'Ni all elementAttributes osod "{{name}}" ar <{{element}}>: mae\'r rendrwr yn berchen arno',
  'markdown.elementAttributes.unknownElement':
    'Mae elementAttributes yn enwi <{{element}}>, nad yw markdown yn ei gynhyrchu',
  'markdown.footnotes.backToReference': 'Yn ôl i gyfeirnod {{reference}}',
  'markdown.footnotes.label': 'Troednodiadau',
}
