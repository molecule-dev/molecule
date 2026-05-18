import type { BillingTranslations } from './types.js'

/** Billing translations for zh-TW. */
export const zhTW: Partial<BillingTranslations> = {
  'billing.status.loading': '載入中…',
  'billing.status.currentPlan': '目前計劃：<x> {{tierName}}</x>',
  'billing.status.cancelCta': '取消訂閱',
  'billing.status.cancelError': '取消操作失敗，請稍後再試。',
  'billing.pricing.loading': '正在加載計劃…',
  'billing.pricing.error': '無法載入價格資訊。請稍後再試。',
  'billing.pricing.checkoutError': '結帳失敗，請重試。',
  'billing.pricing.reassurance': '隨時取消 · 無需信用卡即可開始',
  'billing.pricing.mostPopular': '最受歡迎',
  'billing.pricing.tierEyebrow': '層級',
  'billing.pricing.perSeat': '每座位',
  'billing.pricing.upgradeCta': '升級到{{tierName}}',
}
