import type { BillingTranslations } from './types.js'

/** Billing translations for bn. */
export const bn: Partial<BillingTranslations> = {
  'billing.status.loading': 'লোড হচ্ছে…',
  'billing.status.currentPlan': 'বর্তমান পরিকল্পনা:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'সাবস্ক্রিপশন বাতিল করুন',
  'billing.status.cancelError': 'বাতিল করা সম্ভব হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।',
  'billing.pricing.loading': 'পরিকল্পনা লোড হচ্ছে…',
  'billing.pricing.error': 'মূল্যতালিকা লোড করা যায়নি। পরে আবার চেষ্টা করুন।',
  'billing.pricing.checkoutError': 'চেকআউট শুরু করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।',
  'billing.pricing.reassurance':
    'যেকোনো সময় বাতিল করুন · শুরু করার জন্য কোনো ক্রেডিট কার্ডের প্রয়োজন নেই',
  'billing.pricing.mostPopular': 'সবচেয়ে জনপ্রিয়',
  'billing.pricing.tierEyebrow': 'স্তর',
  'billing.pricing.perSeat': 'প্রতি আসন',
  'billing.pricing.upgradeCta': 'আপগ্রেড করুন<x> {{tierName}}</x>',
}
