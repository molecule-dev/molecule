import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Indonesian. */
export const id: MarkdownTranslations = {
  'markdown.components.invalid':
    'components berisi entri yang bukan komponen React atau nama elemen.',
  'markdown.components.unsupported':
    'Penyedia marked tidak dapat menggunakan components karena mengembalikan string HTML. Gunakan elementAttributes untuk menambahkan atribut.',
  'markdown.elementAttributes.invalidName': '"{{name}}" bukan nama atribut (pada <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes tidak dapat menyetel "{{name}}" pada <{{element}}>: renderer memilikinya',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes menyebut <{{element}}>, yang tidak dihasilkan markdown',
  'markdown.footnotes.backToReference': 'Kembali ke referensi {{reference}}',
  'markdown.footnotes.label': 'Catatan kaki',
}
