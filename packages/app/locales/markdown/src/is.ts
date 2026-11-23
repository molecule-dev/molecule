import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Icelandic. */
export const is: MarkdownTranslations = {
  'markdown.components.invalid':
    'components inniheldur færslu sem er hvorki React-íhlutur né heiti frumeiningar.',
  'markdown.components.unsupported':
    'marked-veitandinn getur ekki notað components því hann skilar HTML-streng. Notaðu elementAttributes til að bæta við eigindum.',
  'markdown.elementAttributes.invalidName': '"{{name}}" er ekki heiti eigindar (á <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes getur ekki sett "{{name}}" á <{{element}}>: teiknarinn á það',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes nefnir <{{element}}>, sem markdown framleiðir ekki',
  'markdown.footnotes.backToReference': 'Til baka í tilvísun {{reference}}',
  'markdown.footnotes.label': 'Neðanmálsgreinar',
}
