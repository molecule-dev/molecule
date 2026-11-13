import type { HealthTranslations } from './types.js'

/** Health translations for Armenian. */
export const hy: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ж {{minutes}}р',
  'health.durationMinutes': '{{minutes}}р',
  'health.error.noProvider':
    '`@molecule/app-health`: Առողջապահական մատակարար չկա կապված՝ ներդրեք `HealthProvider` ինտերֆեյսը ձեր բնօրինակ գործարկման միջավայրում (Apple HealthKit / Android Health Connect / Google Fit) և կապեք այն `setProvider()` ի հետ մեկնարկի ժամանակ: Ոչ մի մատակարար չի մատակարարվում նավատորմի հետ: Հատկանիշների հայտնաբերում `hasProvider()` կամ `getCapabilities().supported` միջոցով՝ կանչելուց առաջ՝ առողջության ընթերցումը չունի իրական լռելյայն արժեք, ուստի այն կեղծ տվյալներ է վերադարձնում, այլ ոչ թե վերադարձնում:',
}
