import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Swahili. */
export const sw: MarkdownTranslations = {
  'markdown.components.invalid':
    'components ina ingizo ambalo si kipengele cha React wala jina la element.',
  'markdown.components.unsupported':
    'Mtoa huduma marked hawezi kutumia components, kwa sababu hurudisha mfuatano wa HTML. Tumia elementAttributes kuongeza sifa.',
  'markdown.elementAttributes.invalidName': '"{{name}}" si jina la sifa (kwenye <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes haiwezi kuweka "{{name}}" kwenye <{{element}}>: inadhibitiwa na renderer',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes hutaja <{{element}}>, ambayo markdown haizalishi',
  'markdown.footnotes.backToReference': 'Rudi kwenye rejeleo {{reference}}',
  'markdown.footnotes.label': 'Maelezo ya chini',
}
