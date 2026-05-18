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
  'billing.status.currentPlan': '当前计划：<x> {{tierName}}</x>',
  'billing.status.cancelError': '取消操作失败，请稍后再试。',
  'billing.pricing.reassurance': '随时取消 · 无需信用卡即可开始',
  'billing.pricing.perSeat': '每座位',
}
