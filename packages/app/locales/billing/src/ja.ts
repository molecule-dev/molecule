import type { BillingTranslations } from './types.js'

/** Billing translations for ja. */
export const ja: Partial<BillingTranslations> = {
  'billing.status.loading': '読み込み中…',
  'billing.status.cancelCta': 'サブスクリプションをキャンセル',
  'billing.pricing.loading': 'プランを読み込み中…',
  'billing.pricing.error': '料金を読み込めませんでした。後ほど再度お試しください。',
  'billing.pricing.checkoutError': 'チェックアウトを開始できませんでした。もう一度お試しください。',
  'billing.pricing.mostPopular': '最も人気',
  'billing.pricing.tierEyebrow': 'ティア',
  'billing.pricing.upgradeCta': '{{tierName}}にアップグレード',
  'billing.status.currentPlan': '現在の計画：<x> {{tierName}}</x>',
  'billing.status.cancelError': 'キャンセルできませんでした。もう一度お試しください。',
  'billing.pricing.reassurance': 'いつでもキャンセル可能 · クレジットカード不要で始められます',
  'billing.pricing.perSeat': '座席あたり',
}
