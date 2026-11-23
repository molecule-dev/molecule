import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Igbo. */
export const ig: MarkdownTranslations = {
  'markdown.components.invalid':
    'components nwere ndenye na-abụghị React component ma ọ bụ aha element.',
  'markdown.components.unsupported':
    "Onye na-enye marked enweghị ike iji components, n'ihi na ọ na-eweghachi HTML string. Jiri elementAttributes tinye attributes.",
  'markdown.elementAttributes.invalidName': '"{{name}}" abụghị aha attribute (na <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes enweghị ike ịtọ "{{name}}" na <{{element}}>: renderer nwe ya',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes na-akpọ <{{element}}>, nke markdown anaghị emepụta',
  'markdown.footnotes.backToReference': 'Laghachi na ntụaka {{reference}}',
  'markdown.footnotes.label': 'Ndetu ala',
}
