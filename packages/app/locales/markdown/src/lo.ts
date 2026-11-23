import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Lao. */
export const lo: MarkdownTranslations = {
  'markdown.components.invalid': 'components ມີລາຍການທີ່ບໍ່ແມ່ນ React component ຫຼື ຊື່ element.',
  'markdown.components.unsupported':
    'ຜູ້ໃຫ້ບໍລິການ marked ບໍ່ສາມາດໃຊ້ components ໄດ້ ເພາະມັນສົ່ງຄືນ HTML string. ໃຊ້ elementAttributes ເພື່ອເພີ່ມ attributes.',
  'markdown.elementAttributes.invalidName': '"{{name}}" ບໍ່ແມ່ນຊື່ attribute (ເທິງ <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes ບໍ່ສາມາດຕັ້ງ "{{name}}" ເທິງ <{{element}}> ໄດ້: renderer ເປັນເຈົ້າຂອງ',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes ຕັ້ງຊື່ <{{element}}> ເຊິ່ງ markdown ບໍ່ຜະລິດ',
  'markdown.footnotes.backToReference': 'ກັບໄປທີ່ການອ້າງອີງ {{reference}}',
  'markdown.footnotes.label': 'ໝາຍເຫດທ້າຍໜ້າ',
}
