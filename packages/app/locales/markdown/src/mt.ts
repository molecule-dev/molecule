import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Maltese. */
export const mt: MarkdownTranslations = {
  'markdown.components.invalid':
    "components fih daħla li mhijiex komponent React jew isem ta' element.",
  'markdown.components.unsupported':
    'Il-fornitur marked ma jistax juża components, għax jirritorna string HTML. Uża elementAttributes biex iżżid attributi.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" mhuwiex isem ta\' attribut (fuq <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes ma jistax jistabbilixxi "{{name}}" fuq <{{element}}>: is-sistema tal-rendering tippossjedih',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes isemmi <{{element}}>, li markdown ma jipproduċix',
  'markdown.footnotes.backToReference': 'Lura għar-referenza {{reference}}',
  'markdown.footnotes.label': 'Noti tal-qiegħ',
}
