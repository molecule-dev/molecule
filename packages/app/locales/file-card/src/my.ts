import type { FileCardTranslations } from './types.js'

/** FileCard translations for my. */
export const my: Partial<FileCardTranslations> = {
  'file-card.modified.just-now': 'ယခုပင်',
  'file-card.kind.image': 'ပုံဖိုင်',
  'file-card.kind.video': 'ဗီဒီယိုဖိုင်',
  'file-card.kind.audio': 'အသံဖိုင်',
  'file-card.kind.document': 'စာရွက်စာတမ်း',
  'file-card.kind.archive': 'မော်ကွန်းတိုက်',
  'file-card.kind.code': 'ကုဒ်ဖိုင်',
  'file-card.kind.folder': 'ဖိုလ်ဒါ',
  'file-card.kind.other': 'ဖိုင်',
  'file-card.aria.root': '{{name}} , {{kind}}',
  'file-card.aria.size': 'အရွယ်အစား {{size}}',
  'file-card.aria.modified': 'ပြုပြင်ထားသော {{when}}',
  'file-card.modified.minute-one': '၁ မိနစ် အကြာက',
  'file-card.modified.minute-other': '{{count}} မိနစ်အကြာက',
  'file-card.modified.hour-one': '၁ နာရီ အကြာက',
  'file-card.modified.hour-other': '{{count}} တစ်နာရီက',
  'file-card.modified.day-one': 'မနေ့က',
  'file-card.modified.day-other': '{{count}} ရက်အနည်းငယ်က',
  'file-card.modified.week-one': '၁ ပတ်က',
  'file-card.modified.week-other': '{{count}} ရက်သတ္တပတ်က',
  'file-card.modified.month-one': '၁ လ အကြာက',
  'file-card.modified.month-other': '{{count}} လွန်ခဲ့တဲ့ မို',
}
