import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Uzbek. */
export const uz: MarkdownTranslations = {
  'markdown.components.invalid':
    "components ichida React komponenti yoki element nomi bo'lmagan yozuv bor.",
  'markdown.components.unsupported':
    "marked provayderi HTML satrini qaytargani uchun components dan foydalana olmaydi. Atribut qo'shish uchun elementAttributes dan foydalaning.",
  'markdown.elementAttributes.invalidName': '"{{name}}" atribut nomi emas (<{{element}}> da)',
  'markdown.elementAttributes.refused':
    'elementAttributes <{{element}}> da "{{name}}" ni o\'rnatolmaydi: u rendererga tegishli',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes <{{element}}> ni nomlaydi, uni markdown yaratmaydi',
  'markdown.footnotes.backToReference': '{{reference}} havolasiga qaytish',
  'markdown.footnotes.label': 'Izohlar',
}
