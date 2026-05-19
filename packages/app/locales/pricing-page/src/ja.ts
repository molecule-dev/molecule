import type { PricingPageTranslations } from './types.js'

/** PricingPage translations for ja. */
export const ja: Partial<PricingPageTranslations> = {
  'pricingPage.loading': 'プランを読み込み中…',
  'pricingPage.error': '料金を読み込めませんでした。後ほど再度お試しください。',
  'pricingPage.checkoutError': 'チェックアウトを開始できませんでした。もう一度お試しください。',
  'pricingPage.upgradeCta': '{{tierName}}にアップグレード',
  'pricingPage.currentCta': '現在のプラン',
  'pricingPage.periodToggle.monthly': '月額',
  'pricingPage.periodToggle.yearly': '年額',
  'pricingPage.planUpdated.heading': 'プランが更新されました',
  'pricingPage.heading': 'プランを選択してください',
  'pricingPage.perSeat': '座席あたり',
  'pricingPage.periodToggle.label': '請求期間',
  'pricingPage.planUpdated.body':
    'アップグレードありがとうございます。新しいプランは即日有効となり、領収書をメールでお送りしました。',
  'pricingPage.planUpdated.headingNamed': 'あなたは今{{planName}}プラン',
}
