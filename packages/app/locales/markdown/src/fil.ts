import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Filipino. */
export const fil: MarkdownTranslations = {
  'markdown.components.invalid':
    'Ang components ay may entry na hindi isang React component o pangalan ng element.',
  'markdown.components.unsupported':
    'Hindi magagamit ng marked provider ang components dahil nagbabalik ito ng HTML string. Gamitin ang elementAttributes para magdagdag ng attributes.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" ay hindi pangalan ng attribute (sa <{{element}}>)',
  'markdown.elementAttributes.refused':
    'Hindi maitatakda ng elementAttributes ang "{{name}}" sa <{{element}}>: pagmamay-ari ito ng renderer',
  'markdown.elementAttributes.unknownElement':
    'Pinangalanan ng elementAttributes ang <{{element}}>, na hindi ginagawa ng markdown',
  'markdown.footnotes.backToReference': 'Bumalik sa reperensiya {{reference}}',
  'markdown.footnotes.label': 'Mga talababa',
}
