import type { BillingTranslations } from './types.js'

/** Billing translations for ne. */
export const ne: Partial<BillingTranslations> = {
  'billing.status.loading': 'लोड हुँदै...',
  'billing.status.currentPlan': 'हालको योजना:<x> {{स्तरीय नाम}}</x>',
  'billing.status.cancelCta': 'सदस्यता रद्द गर्नुहोस्',
  'billing.status.cancelError': 'रद्द गर्न सकिएन। कृपया फेरि प्रयास गर्नुहोस्।',
  'billing.pricing.loading': 'योजनाहरू लोड गर्दै...',
  'billing.pricing.error': 'मूल्य निर्धारण लोड गर्न सकिएन। पछि फेरि प्रयास गर्नुहोस्।',
  'billing.pricing.checkoutError': 'चेकआउट सुरु गर्न सकिएन। कृपया फेरि प्रयास गर्नुहोस्।',
  'billing.pricing.reassurance':
    'जुनसुकै बेला रद्द गर्नुहोस् · सुरु गर्न कुनै क्रेडिट कार्ड आवश्यक पर्दैन',
  'billing.pricing.mostPopular': 'सबैभन्दा लोकप्रिय',
  'billing.pricing.tierEyebrow': 'तह',
  'billing.pricing.perSeat': 'प्रति सिट',
  'billing.pricing.upgradeCta': 'स्तरोन्नति गर्नुहोस्<x> {{स्तरीय नाम}}</x>',
}
