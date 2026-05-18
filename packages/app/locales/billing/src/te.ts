import type { BillingTranslations } from './types.js'

/** Billing translations for te. */
export const te: Partial<BillingTranslations> = {
  'billing.status.loading': 'లోడ్ అవుతోంది…',
  'billing.status.currentPlan': 'ప్రస్తుత ప్రణాళిక:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'సభ్యత్వాన్ని రద్దు చేయండి',
  'billing.status.cancelError': 'రద్దు చేయలేకపోయాము. దయచేసి మళ్ళీ ప్రయత్నించండి.',
  'billing.pricing.loading': 'ప్రణాళికలు లోడ్ అవుతున్నాయి…',
  'billing.pricing.error': 'ధరలను లోడ్ చేయలేకపోయాము. తర్వాత మళ్ళీ ప్రయత్నించండి.',
  'billing.pricing.checkoutError': 'చెక్‌అవుట్ ప్రారంభించలేకపోయాము. దయచేసి మళ్ళీ ప్రయత్నించండి.',
  'billing.pricing.reassurance':
    'ఎప్పుడైనా రద్దు చేసుకోండి · ప్రారంభించడానికి క్రెడిట్ కార్డ్ అవసరం లేదు',
  'billing.pricing.mostPopular': 'అత్యంత ప్రజాదరణ పొందిన',
  'billing.pricing.tierEyebrow': 'శ్రేణి',
  'billing.pricing.perSeat': 'ఒక్కో సీటుకు',
  'billing.pricing.upgradeCta': 'అప్‌గ్రేడ్ చేయండి<x> {{tierName}}</x>',
}
