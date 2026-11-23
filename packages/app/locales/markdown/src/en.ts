import type { MarkdownTranslations } from './types.js'

/** Markdown translations for English. */
export const en: MarkdownTranslations = {
  'markdown.components.invalid':
    'components holds an entry that is not a React component or an element name.',
  'markdown.components.unsupported':
    'The marked provider cannot use components, because it returns an HTML string. Use elementAttributes to add attributes.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" is not an attribute name (on <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes cannot set "{{name}}" on <{{element}}>: the renderer owns it',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes names <{{element}}>, which markdown does not produce',
  'markdown.footnotes.backToReference': 'Back to reference {{reference}}',
  'markdown.footnotes.label': 'Footnotes',
}
