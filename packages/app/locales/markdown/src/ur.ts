import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Urdu. */
export const ur: MarkdownTranslations = {
  'markdown.components.invalid':
    'components میں ایسی اندراج ہے جو React جزو یا عنصر کا نام نہیں ہے۔',
  'markdown.components.unsupported':
    'marked فراہم کنندہ components استعمال نہیں کر سکتا، کیونکہ یہ HTML سٹرنگ واپس کرتا ہے۔ خصوصیات شامل کرنے کے لیے elementAttributes استعمال کریں۔',
  'markdown.elementAttributes.invalidName': '"{{name}}" خصوصیت کا نام نہیں ہے (<{{element}}> پر)',
  'markdown.elementAttributes.refused':
    'elementAttributes <{{element}}> پر "{{name}}" سیٹ نہیں کر سکتا: یہ رینڈرر کی ملکیت ہے',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes <{{element}}> کا نام لیتا ہے، جسے markdown پیدا نہیں کرتا',
  'markdown.footnotes.backToReference': 'حوالہ {{reference}} پر واپس جائیں',
  'markdown.footnotes.label': 'حواشی',
}
