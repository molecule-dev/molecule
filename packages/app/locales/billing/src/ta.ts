import type { BillingTranslations } from './types.js'

/** Billing translations for ta. */
export const ta: Partial<BillingTranslations> = {
  'billing.status.loading': 'ஏற்றப்படுகிறது…',
  'billing.status.currentPlan': 'தற்போதைய திட்டம்:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'சந்தாவை ரத்துசெய்',
  'billing.status.cancelError': 'ரத்து செய்ய முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'billing.pricing.loading': 'திட்டங்கள் ஏற்றப்படுகின்றன…',
  'billing.pricing.error': 'விலை விவரங்களை ஏற்ற முடியவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்.',
  'billing.pricing.checkoutError':
    'பணம் செலுத்தும் செயல்முறையைத் தொடங்க முடியவில்லை. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
  'billing.pricing.reassurance':
    'எப்போது வேண்டுமானாலும் ரத்து செய்யலாம் · தொடங்குவதற்கு கடன் அட்டை தேவையில்லை',
  'billing.pricing.mostPopular': 'மிகவும் பிரபலமான',
  'billing.pricing.tierEyebrow': 'அடுக்கு',
  'billing.pricing.perSeat': 'ஒரு இருக்கைக்கு',
  'billing.pricing.upgradeCta': 'மேம்படுத்த<x> {{tierName}}</x>',
}
