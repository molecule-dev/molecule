import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Mongolian. */
export const mn: MarkdownTranslations = {
  'markdown.components.invalid':
    'components нь React компонент эсвэл элементийн нэр биш бичлэг агуулж байна.',
  'markdown.components.unsupported':
    'marked нийлүүлэгч HTML мөр буцаадаг тул components ашиглах боломжгүй. Атрибут нэмэхийн тулд elementAttributes ашиглана уу.',
  'markdown.elementAttributes.invalidName': '"{{name}}" нь атрибутын нэр биш (<{{element}}> дээр)',
  'markdown.elementAttributes.refused':
    'elementAttributes нь <{{element}}> дээр "{{name}}" тохируулж чадахгүй: үүнийг renderer эзэмшдэг',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes нь <{{element}}>-ийг нэрлэдэг бөгөөд markdown үүнийг үүсгэдэггүй',
  'markdown.footnotes.backToReference': '{{reference}} лавлагаа руу буцах',
  'markdown.footnotes.label': 'Зүүлт тайлбар',
}
