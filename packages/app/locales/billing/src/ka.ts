import type { BillingTranslations } from './types.js'

/** Billing translations for ka. */
export const ka: Partial<BillingTranslations> = {
  'billing.status.loading': 'იტვირთება…',
  'billing.status.currentPlan': 'მიმდინარე გეგმა:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'გამოწერის გაუქმება',
  'billing.status.cancelError': 'გაუქმება ვერ მოხერხდა. გთხოვთ, სცადოთ ხელახლა.',
  'billing.pricing.loading': 'გეგმები იტვირთება…',
  'billing.pricing.error': 'ფასების ჩატვირთვა ვერ მოხერხდა. სცადეთ მოგვიანებით.',
  'billing.pricing.checkoutError':
    'შეკვეთის გაფორმების დაწყება ვერ მოხერხდა. გთხოვთ, სცადოთ ხელახლა.',
  'billing.pricing.reassurance':
    'გააუქმეთ ნებისმიერ დროს · დასაწყებად საკრედიტო ბარათი არ არის საჭირო',
  'billing.pricing.mostPopular': 'ყველაზე პოპულარული',
  'billing.pricing.tierEyebrow': 'იარუსი',
  'billing.pricing.perSeat': 'თითო ადგილზე',
  'billing.pricing.upgradeCta': 'განახლება<x> {{tierName}}</x>',
}
