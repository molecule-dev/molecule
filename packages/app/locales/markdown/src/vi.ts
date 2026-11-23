import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Vietnamese. */
export const vi: MarkdownTranslations = {
  'markdown.components.invalid':
    'components chứa một mục không phải là thành phần React hay tên phần tử.',
  'markdown.components.unsupported':
    'Nhà cung cấp marked không thể dùng components vì nó trả về chuỗi HTML. Dùng elementAttributes để thêm thuộc tính.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" không phải là tên thuộc tính (trên <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes không thể đặt "{{name}}" trên <{{element}}>: trình kết xuất sở hữu nó',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes đặt tên <{{element}}>, mà markdown không tạo ra',
  'markdown.footnotes.backToReference': 'Quay lại tham chiếu {{reference}}',
  'markdown.footnotes.label': 'Chú thích cuối trang',
}
