import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Burmese. */
export const my: MarkdownTranslations = {
  'markdown.components.invalid':
    'components တွင် React အစိတ်အပိုင်း သို့မဟုတ် element အမည် မဟုတ်သော ထည့်သွင်းချက် ပါဝင်သည်။',
  'markdown.components.unsupported':
    'marked ပံ့ပိုးသူသည် HTML string ပြန်ပေးသောကြောင့် components ကို အသုံးမပြုနိုင်ပါ။ attributes ထည့်ရန် elementAttributes ကို အသုံးပြုပါ။',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" သည် attribute အမည် မဟုတ်ပါ (<{{element}}> ပေါ်တွင်)',
  'markdown.elementAttributes.refused':
    'elementAttributes သည် <{{element}}> ပေါ်တွင် "{{name}}" ကို သတ်မှတ်၍ မရပါ- renderer က ပိုင်ဆိုင်သည်',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes သည် <{{element}}> ကို အမည်ပေးသည်၊ markdown က မထုတ်လုပ်ပါ',
  'markdown.footnotes.backToReference': 'ရည်ညွှန်းချက် {{reference}} သို့ ပြန်သွားရန်',
  'markdown.footnotes.label': 'အောက်ခြေမှတ်စုများ',
}
