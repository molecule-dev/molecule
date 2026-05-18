import type { BillingTranslations } from './types.js'

/** Billing translations for km. */
export const km: Partial<BillingTranslations> = {
  'billing.status.loading': 'កំពុងផ្ទុក…',
  'billing.status.currentPlan': 'ផែនការបច្ចុប្បន្ន៖<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'បោះបង់ការជាវ',
  'billing.status.cancelError': 'មិនអាចលុបចោលបានទេ។ សូមព្យាយាមម្តងទៀត។',
  'billing.pricing.loading': 'កំពុងផ្ទុកផែនការ…',
  'billing.pricing.error': 'មិនអាចផ្ទុកតម្លៃបានទេ។ សូមព្យាយាមម្តងទៀតនៅពេលក្រោយ។',
  'billing.pricing.checkoutError': 'មិនអាចចាប់ផ្តើមទូទាត់ប្រាក់បានទេ។ សូមព្យាយាមម្តងទៀត។',
  'billing.pricing.reassurance': 'បោះបង់នៅពេលណាក៏បាន · មិនតម្រូវឱ្យមានកាតឥណទានដើម្បីចាប់ផ្តើមទេ',
  'billing.pricing.mostPopular': 'ពេញនិយមបំផុត',
  'billing.pricing.tierEyebrow': 'កម្រិត',
  'billing.pricing.perSeat': 'ក្នុងមួយកៅអី',
  'billing.pricing.upgradeCta': 'ធ្វើឱ្យប្រសើរឡើងទៅ<x> {{tierName}}</x>',
}
