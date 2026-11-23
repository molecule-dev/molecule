import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Finnish. */
export const fi: MarkdownTranslations = {
  'markdown.components.invalid':
    'components sisältää merkinnän, joka ei ole React-komponentti eikä elementin nimi.',
  'markdown.components.unsupported':
    'marked-tarjoaja ei voi käyttää components-asetusta, koska se palauttaa HTML-merkkijonon. Lisää attribuutteja elementAttributes-asetuksella.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" ei ole attribuutin nimi (elementissä <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes ei voi asettaa "{{name}}" elementtiin <{{element}}>: renderöijä omistaa sen',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes nimeää elementin <{{element}}>, jota markdown ei tuota',
  'markdown.footnotes.backToReference': 'Takaisin viitteeseen {{reference}}',
  'markdown.footnotes.label': 'Alaviitteet',
}
