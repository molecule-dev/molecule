import type { BillingTranslations } from './types.js'

/** Billing translations for zh. */
export const zh: Partial<BillingTranslations> = {
  'billing.status.loading': '加载中…',
  'billing.status.cancelCta': '取消订阅',
  'billing.pricing.loading': '正在加载方案…',
  'billing.pricing.error': '无法加载定价。请稍后再试。',
  'billing.pricing.checkoutError': '无法启动结账。请重试。',
  'billing.pricing.mostPopular': '最受欢迎',
  'billing.pricing.tierEyebrow': '层级',
  'billing.pricing.upgradeCta': '升级到{{tierName}}',
}
