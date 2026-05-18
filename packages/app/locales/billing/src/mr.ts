import type { BillingTranslations } from './types.js'

/** Billing translations for mr. */
export const mr: Partial<BillingTranslations> = {
  'billing.status.loading': 'लोडिंग…',
  'billing.status.currentPlan': 'सध्याची योजना:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'सदस्यता रद्द करा',
  'billing.status.cancelError': 'रद्द करता आले नाही. कृपया पुन्हा प्रयत्न करा.',
  'billing.pricing.loading': 'योजना लोड होत आहेत…',
  'billing.pricing.error': 'किंमत लोड होऊ शकली नाही. कृपया नंतर पुन्हा प्रयत्न करा.',
  'billing.pricing.checkoutError': 'चेकआउट सुरू करता आले नाही. कृपया पुन्हा प्रयत्न करा.',
  'billing.pricing.reassurance': 'कधीही रद्द करा · सुरू करण्यासाठी क्रेडिट कार्डची आवश्यकता नाही',
  'billing.pricing.mostPopular': 'सर्वात लोकप्रिय',
  'billing.pricing.tierEyebrow': 'स्तर',
  'billing.pricing.perSeat': 'प्रति सीट',
  'billing.pricing.upgradeCta': 'अपग्रेड करा<x> {{tierName}}</x>',
}
