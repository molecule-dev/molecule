import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Dutch. */
export const nl: MarkdownTranslations = {
  'markdown.components.invalid':
    'components bevat een item dat geen React-component en geen elementnaam is.',
  'markdown.components.unsupported':
    'De marked-provider kan components niet gebruiken, omdat hij een HTML-string retourneert. Gebruik elementAttributes om attributen toe te voegen.',
  'markdown.elementAttributes.invalidName': '"{{name}}" is geen attribuutnaam (op <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes kan "{{name}}" niet instellen op <{{element}}>: de renderer is er eigenaar van',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes noemt <{{element}}>, die markdown niet produceert',
  'markdown.footnotes.backToReference': 'Terug naar verwijzing {{reference}}',
  'markdown.footnotes.label': 'Voetnoten',
}
