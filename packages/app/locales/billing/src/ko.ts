import type { BillingTranslations } from './types.js'

/** Billing translations for ko. */
export const ko: Partial<BillingTranslations> = {
  'billing.status.loading': '불러오는 중…',
  'billing.status.cancelCta': '구독 취소',
  'billing.pricing.loading': '요금제를 불러오는 중…',
  'billing.pricing.error': '가격을 불러올 수 없습니다. 나중에 다시 시도해 주세요.',
  'billing.pricing.checkoutError': '결제를 시작할 수 없습니다. 다시 시도해 주세요.',
  'billing.pricing.mostPopular': '가장 인기',
  'billing.pricing.tierEyebrow': '등급',
  'billing.pricing.upgradeCta': '{{tierName}}(으)로 업그레이드',
}
