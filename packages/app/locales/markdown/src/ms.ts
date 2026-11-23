import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Malay. */
export const ms: MarkdownTranslations = {
  'markdown.components.invalid':
    'components mengandungi entri yang bukan komponen React atau nama elemen.',
  'markdown.components.unsupported':
    'Pembekal marked tidak boleh menggunakan components kerana ia memulangkan rentetan HTML. Gunakan elementAttributes untuk menambah atribut.',
  'markdown.elementAttributes.invalidName': '"{{name}}" bukan nama atribut (pada <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes tidak boleh menetapkan "{{name}}" pada <{{element}}>: ia dimiliki oleh pemapar',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes menamakan <{{element}}>, yang tidak dihasilkan oleh markdown',
  'markdown.footnotes.backToReference': 'Kembali ke rujukan {{reference}}',
  'markdown.footnotes.label': 'Nota kaki',
}
