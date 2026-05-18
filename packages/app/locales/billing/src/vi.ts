import type { BillingTranslations } from './types.js'

/** Billing translations for vi. */
export const vi: Partial<BillingTranslations> = {
  'billing.status.loading': 'Đang tải…',
  'billing.status.cancelCta': 'Hủy đăng ký',
  'billing.pricing.loading': 'Đang tải các gói…',
  'billing.pricing.error': 'Không thể tải bảng giá. Vui lòng thử lại sau.',
  'billing.pricing.checkoutError': 'Không thể bắt đầu thanh toán. Vui lòng thử lại.',
  'billing.pricing.mostPopular': 'Phổ biến nhất',
  'billing.pricing.tierEyebrow': 'Bậc',
  'billing.pricing.upgradeCta': 'Nâng cấp lên {{tierName}}',
}
