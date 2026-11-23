import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Estonian. */
export const et: MarkdownTranslations = {
  'markdown.components.invalid':
    'components sisaldab kirjet, mis ei ole Reacti komponent ega elemendi nimi.',
  'markdown.components.unsupported':
    'marked-i pakkuja ei saa components kasutada, sest tagastab HTML-stringi. Atribuutide lisamiseks kasuta elementAttributes.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" ei ole atribuudi nimi (elemendil <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes ei saa määrata "{{name}}" elemendile <{{element}}>: renderdaja omab seda',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes nimetab <{{element}}>, mida markdown ei tooda',
  'markdown.footnotes.backToReference': 'Tagasi viitele {{reference}}',
  'markdown.footnotes.label': 'Joonealused märkused',
}
