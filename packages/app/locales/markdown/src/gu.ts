import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Gujarati. */
export const gu: MarkdownTranslations = {
  'markdown.components.invalid':
    'components માં એવી એન્ટ્રી છે જે React કોમ્પોનન્ટ કે એલિમેન્ટનું નામ નથી.',
  'markdown.components.unsupported':
    'marked પ્રોવાઇડર components વાપરી શકતું નથી, કારણ કે તે HTML સ્ટ્રિંગ પરત આપે છે. એટ્રિબ્યુટ ઉમેરવા માટે elementAttributes વાપરો.',
  'markdown.elementAttributes.invalidName': '"{{name}}" એટ્રિબ્યુટનું નામ નથી (<{{element}}> પર)',
  'markdown.elementAttributes.refused':
    'elementAttributes <{{element}}> પર "{{name}}" સેટ કરી શકતું નથી: તે રેન્ડરરની માલિકીનું છે',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes <{{element}}> નામ આપે છે, જે markdown બનાવતું નથી',
  'markdown.footnotes.backToReference': 'સંદર્ભ {{reference}} પર પાછા જાઓ',
  'markdown.footnotes.label': 'ફૂટનોટ્સ',
}
