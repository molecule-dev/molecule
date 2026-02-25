import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Burmese. */
export const my: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'အခြေအနေ ဒက်ရှ်ဘုတ် ပံ့ပိုးသူကို ပြင်ဆင်မထားပါ။',
  'statusDashboard.error.fetchFailed': 'အခြေအနေကို ရယူ၍မရပါ: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'စနစ်များအားလုံး ပုံမှန်အလုပ်လုပ်နေသည်',
  'statusDashboard.label.someIssues': 'စနစ်အချို့တွင် ပြဿနာများ ကြုံနေသည်',
  'statusDashboard.label.majorOutage': 'စနစ် ကြီးကြီးမားမား ပျက်ကျခြင်း',
  'statusDashboard.label.operational': 'အလုပ်လုပ်နေသည်',
  'statusDashboard.label.degraded': 'ကျဆင်းနေသည်',
  'statusDashboard.label.down': 'ရပ်နေသည်',
  'statusDashboard.label.unknown': 'မသိ',
  'statusDashboard.label.services': 'ဝန်ဆောင်မှုများ',
  'statusDashboard.label.incidents': 'ဖြစ်ရပ်များ',
  'statusDashboard.label.uptime': 'အလုပ်လုပ်ချိန်',
  'statusDashboard.label.lastChecked': 'နောက်ဆုံးစစ်ဆေးချိန် {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'ဖြစ်ရပ်များ သတင်းပို့ထားခြင်း မရှိပါ။',
}
