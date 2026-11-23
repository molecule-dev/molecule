import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Belarusian. */
export const be: MarkdownTranslations = {
  'markdown.components.invalid':
    "components змяшчае запіс, які не з'яўляецца кампанентам React або імем элемента.",
  'markdown.components.unsupported':
    'Правайдэр marked не можа выкарыстоўваць components, бо вяртае радок HTML. Каб дадаць атрыбуты, выкарыстоўвайце elementAttributes.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" не з\'яўляецца імем атрыбута (на <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes не можа ўсталяваць "{{name}}" на <{{element}}>: гэтым валодае рэндэрынг',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes называе <{{element}}>, які markdown не стварае',
  'markdown.footnotes.backToReference': 'Вярнуцца да спасылкі {{reference}}',
  'markdown.footnotes.label': 'Зноскі',
}
