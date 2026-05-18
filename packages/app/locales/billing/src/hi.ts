import type { BillingTranslations } from './types.js'

/** Billing translations for hi. */
export const hi: Partial<BillingTranslations> = {
  'billing.status.loading': 'लोड हो रहा है…',
  'billing.status.cancelCta': 'सदस्यता रद्द करें',
  'billing.pricing.loading': 'योजनाएँ लोड हो रही हैं…',
  'billing.pricing.error': 'मूल्य निर्धारण लोड नहीं हो सका। बाद में पुनः प्रयास कीजिए।',
  'billing.pricing.checkoutError': 'चेकआउट शुरू नहीं किया जा सका। कृपया पुनः प्रयास करें।',
  'billing.pricing.mostPopular': 'सबसे लोकप्रिय',
  'billing.pricing.tierEyebrow': 'टियर',
  'billing.pricing.upgradeCta': '{{tierName}} पर अपग्रेड कीजिए',
  'billing.status.currentPlan': 'वर्तमान योजना:<x> {{tierName}}</x>',
  'billing.status.cancelError': 'रद्द नहीं हो सका। कृपया पुनः प्रयास करें।',
  'billing.pricing.reassurance':
    'कभी भी रद्द करें · शुरू करने के लिए क्रेडिट कार्ड की आवश्यकता नहीं है',
  'billing.pricing.perSeat': 'प्रति सीट',
}
