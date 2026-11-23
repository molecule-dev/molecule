import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Greek. */
export const el: MarkdownTranslations = {
  'markdown.components.invalid':
    'Το components περιέχει μια καταχώριση που δεν είναι στοιχείο React ούτε όνομα στοιχείου.',
  'markdown.components.unsupported':
    'Ο πάροχος marked δεν μπορεί να χρησιμοποιήσει components, επειδή επιστρέφει συμβολοσειρά HTML. Χρησιμοποιήστε το elementAttributes για να προσθέσετε ιδιότητες.',
  'markdown.elementAttributes.invalidName':
    'Το "{{name}}" δεν είναι όνομα ιδιότητας (στο <{{element}}>)',
  'markdown.elementAttributes.refused':
    'Το elementAttributes δεν μπορεί να ορίσει το "{{name}}" στο <{{element}}>: το κατέχει ο renderer',
  'markdown.elementAttributes.unknownElement':
    'Το elementAttributes ονομάζει το <{{element}}>, το οποίο το markdown δεν παράγει',
  'markdown.footnotes.backToReference': 'Επιστροφή στην παραπομπή {{reference}}',
  'markdown.footnotes.label': 'Υποσημειώσεις',
}
