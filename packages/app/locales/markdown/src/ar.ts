import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Arabic. */
export const ar: MarkdownTranslations = {
  'markdown.components.invalid': 'يحتوي components على عنصر ليس مكوّن React ولا اسم عنصر.',
  'markdown.components.unsupported':
    'لا يستطيع مزوّد marked استخدام components لأنه يعيد سلسلة HTML. استخدم elementAttributes لإضافة السمات.',
  'markdown.elementAttributes.invalidName': '"{{name}}" ليس اسم سمة (على <{{element}}>)',
  'markdown.elementAttributes.refused':
    'لا يمكن لـ elementAttributes تعيين "{{name}}" على <{{element}}>: فالمُصيِّر يملكه',
  'markdown.elementAttributes.unknownElement':
    'يسمّي elementAttributes العنصر <{{element}}>، وهو ما لا ينتجه markdown',
  'markdown.footnotes.backToReference': 'العودة إلى المرجع {{reference}}',
  'markdown.footnotes.label': 'الحواشي',
}
