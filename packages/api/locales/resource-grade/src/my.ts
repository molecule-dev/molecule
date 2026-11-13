import type { GradeTranslations } from './types.js'

/** Grade translations for Burmese. */
export const my: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'enrollmentId၊ assignmentId၊ userId နှင့် courseId တို့ကို လိုအပ်သည်',
  'grade.error.scoreNumeric': 'scorePoints နှင့် maxPoints များသည် ဂဏန်းများဖြစ်ရမည်',
  'grade.error.maxPointsPositive': 'maxPoints များသည် သုညထက် ကြီးရမည်',
  'grade.error.scoreOutOfRange': 'ရမှတ်အမှတ်များသည် ၀ မှ အများဆုံးအမှတ်များကြားတွင် ရှိရမည်',
  'grade.error.createFailed': 'အဆင့်တင်၍မရပါ',
  'grade.error.notFound': 'အဆင့်သတ်မှတ်ချက် မတွေ့ပါ',
  'grade.error.readFailed': 'အဆင့်ကို ဖတ်၍မရပါ',
  'grade.error.listFailed': 'အဆင့်များကို စာရင်းပြုစု၍မရပါ',
  'grade.error.updateFailed': 'အဆင့်ကို အပ်ဒိတ်လုပ်၍မရပါ',
  'grade.error.deleteFailed': 'အဆင့်ကို ဖျက်၍မရပါ',
  'grade.error.noGrades': 'အဆင့်များ မတွေ့ပါ',
  'grade.error.courseAverageFailed': 'သင်တန်းပျမ်းမျှကို တွက်ချက်၍မရပါ',
  'grade.error.gpaFailed': 'GPA တွက်ချက်၍မရပါ',
  'grade.error.transcriptFailed': 'မှတ်တမ်းတည်ဆောက်ခြင်း မအောင်မြင်ပါ',
}
