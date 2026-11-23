import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Hausa. */
export const ha: MarkdownTranslations = {
  'markdown.components.invalid':
    'components yana ɗauke da shigarwar da ba React component ba ko sunan element ba.',
  'markdown.components.unsupported':
    'Mai samar da marked ba zai iya amfani da components ba, saboda yana mayar da HTML string. Yi amfani da elementAttributes don ƙara attributes.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" ba sunan attribute ba ne (akan <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes ba zai iya saita "{{name}}" akan <{{element}}> ba: renderer ne ya mallaka',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes yana ambaton <{{element}}>, wanda markdown ba ya samarwa',
  'markdown.footnotes.backToReference': 'Koma zuwa maganar {{reference}}',
  'markdown.footnotes.label': 'Bayanan ƙasa',
}
