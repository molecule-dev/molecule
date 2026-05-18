import type { BillingTranslations } from './types.js'

/** Billing translations for am. */
export const am: Partial<BillingTranslations> = {
  'billing.status.loading': 'በመጫን ላይ…',
  'billing.status.currentPlan': 'የአሁኑ ዕቅድ፦<x> {{የደረጃ ስም}}</x>',
  'billing.status.cancelCta': 'የደንበኝነት ምዝገባ ሰርዝ',
  'billing.status.cancelError': 'መሰረዝ አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
  'billing.pricing.loading': 'ዕቅዶችን በመጫን ላይ…',
  'billing.pricing.error': 'የዋጋ አሰጣጥ መጫን አልተቻለም። ቆይተው እንደገና ይሞክሩ።',
  'billing.pricing.checkoutError': 'ክፍያ መፈጸም አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
  'billing.pricing.reassurance': 'በማንኛውም ጊዜ ሰርዝ · ለመጀመር የክሬዲት ካርድ አያስፈልግም',
  'billing.pricing.mostPopular': 'በጣም ተወዳጅ',
  'billing.pricing.tierEyebrow': 'ደረጃ',
  'billing.pricing.perSeat': 'በአንድ መቀመጫ',
  'billing.pricing.upgradeCta': 'ወደ ያሻሽሉ<x> {{የደረጃ ስም}}</x>',
}
