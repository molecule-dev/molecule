import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Persian. */
export const fa: MarkdownTranslations = {
  'markdown.components.invalid':
    'components شامل ورودی‌ای است که نه مؤلفهٔ React است و نه نام عنصر.',
  'markdown.components.unsupported':
    'ارائه‌دهندهٔ marked نمی‌تواند از components استفاده کند، زیرا یک رشتهٔ HTML برمی‌گرداند. برای افزودن ویژگی‌ها از elementAttributes استفاده کنید.',
  'markdown.elementAttributes.invalidName': '"{{name}}" نام ویژگی نیست (روی <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes نمی‌تواند "{{name}}" را روی <{{element}}> تنظیم کند: رندرکننده مالک آن است',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes عنصر <{{element}}> را نام می‌برد، که markdown آن را تولید نمی‌کند',
  'markdown.footnotes.backToReference': 'بازگشت به ارجاع {{reference}}',
  'markdown.footnotes.label': 'پانویس‌ها',
}
