import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Yoruba. */
export const yo: MarkdownTranslations = {
  'markdown.components.invalid': 'components ní àkọsílẹ̀ tí kì í ṣe ẹ̀yà React tàbí orúkọ element.',
  'markdown.components.unsupported':
    'Olùpèsè marked kò lè lo components, nítorí ó ń dá HTML string padà. Lo elementAttributes láti fi àwọn ànímọ́ kún.',
  'markdown.elementAttributes.invalidName': '"{{name}}" kì í ṣe orúkọ ànímọ́ (lorí <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes kò lè ṣètò "{{name}}" lorí <{{element}}>: renderer ló ni í',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes dárúkọ <{{element}}>, èyí tí markdown kò ṣe',
  'markdown.footnotes.backToReference': 'Padà sí ìtọ́kasí {{reference}}',
  'markdown.footnotes.label': 'Àwọn àkọsílẹ̀ ìsàlẹ̀',
}
