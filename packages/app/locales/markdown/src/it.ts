import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Italian. */
export const it: MarkdownTranslations = {
  'markdown.components.invalid':
    'components contiene una voce che non è un componente React né un nome di elemento.',
  'markdown.components.unsupported':
    'Il provider marked non può usare components, perché restituisce una stringa HTML. Usa elementAttributes per aggiungere attributi.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" non è un nome di attributo (su <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes non può impostare "{{name}}" su <{{element}}>: è di proprietà del renderer',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes nomina <{{element}}>, che markdown non produce',
  'markdown.footnotes.backToReference': 'Torna al riferimento {{reference}}',
  'markdown.footnotes.label': 'Note a piè di pagina',
}
