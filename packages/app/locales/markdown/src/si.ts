import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Sinhala. */
export const si: MarkdownTranslations = {
  'markdown.components.invalid':
    'components හි React සංරචකයක් හෝ මූලද්‍රව්‍ය නාමයක් නොවන සටහනක් ඇත.',
  'markdown.components.unsupported':
    'marked සපයන්නාට components භාවිත කළ නොහැක, එය HTML තන්තුවක් ලබා දෙන බැවිනි. ගුණාංග එක් කිරීමට elementAttributes භාවිත කරන්න.',
  'markdown.elementAttributes.invalidName': '"{{name}}" යනු ගුණාංග නාමයක් නොවේ (<{{element}}> මත)',
  'markdown.elementAttributes.refused':
    'elementAttributes <{{element}}> මත "{{name}}" සැකසිය නොහැක: එය renderer සතුය',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes <{{element}}> නම් කරයි, එය markdown නිපදවන්නේ නැත',
  'markdown.footnotes.backToReference': 'යොමුව {{reference}} වෙත ආපසු යන්න',
  'markdown.footnotes.label': 'පාද සටහන්',
}
