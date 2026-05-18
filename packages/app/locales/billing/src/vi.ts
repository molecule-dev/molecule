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
  'billing.status.currentPlan': 'Kế hoạch hiện tại:<x> {{tierName}}</x>',
  'billing.status.cancelError': 'Không thể hủy. Vui lòng thử lại.',
  'billing.pricing.reassurance': 'Hủy bất cứ lúc nào · Không cần thẻ tín dụng để bắt đầu',
  'billing.pricing.perSeat': 'mỗi chỗ ngồi',
}
