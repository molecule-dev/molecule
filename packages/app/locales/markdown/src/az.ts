import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Azerbaijani. */
export const az: MarkdownTranslations = {
  'markdown.components.invalid':
    'components, React komponenti və ya element adı olmayan bir giriş saxlayır.',
  'markdown.components.unsupported':
    'marked provayderi components istifadə edə bilməz, çünki HTML sətri qaytarır. Atribut əlavə etmək üçün elementAttributes-dən istifadə edin.',
  'markdown.elementAttributes.invalidName': '"{{name}}" atribut adı deyil (<{{element}}> üzərində)',
  'markdown.elementAttributes.refused':
    'elementAttributes <{{element}}> üzərində "{{name}}" təyin edə bilməz: onu renderer idarə edir',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes <{{element}}> adını çəkir, markdown isə onu yaratmır',
  'markdown.footnotes.backToReference': 'İstinad {{reference}}-ə qayıt',
  'markdown.footnotes.label': 'Dipnotlar',
}
