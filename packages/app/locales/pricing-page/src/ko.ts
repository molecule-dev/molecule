import type { PricingPageTranslations } from './types.js'

/** PricingPage translations for ko. */
export const ko: Partial<PricingPageTranslations> = {
  'pricingPage.loading': '요금제를 불러오는 중…',
  'pricingPage.error': '가격을 불러올 수 없습니다. 나중에 다시 시도해 주세요.',
  'pricingPage.checkoutError': '결제를 시작할 수 없습니다. 다시 시도해 주세요.',
  'pricingPage.upgradeCta': '{{tierName}}(으)로 업그레이드',
  'pricingPage.currentCta': '현재 요금제',
  'pricingPage.periodToggle.monthly': '월간',
  'pricingPage.periodToggle.yearly': '연간',
  'pricingPage.planUpdated.heading': '요금제가 업데이트되었습니다',
  'pricingPage.heading': '요금제를 선택하세요',
  'pricingPage.perSeat': '좌석당',
  'pricingPage.periodToggle.label': '청구 기간',
  'pricingPage.planUpdated.body':
    '업그레이드해 주셔서 감사합니다. 새 요금제는 즉시 적용되며, 영수증은 이메일로 발송되었습니다.',
  'pricingPage.planUpdated.headingNamed':
    '지금 보고 계신 페이지는 다음과 같습니다.<x> {{planName}}</x> 계획',
}
