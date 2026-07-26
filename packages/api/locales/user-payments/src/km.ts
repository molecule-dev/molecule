import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Khmer. */
export const km: UserPaymentTranslations = {
  'user.payment.providerRequired': 'ត្រូវការអ្នកផ្តល់សេវាបង់ប្រាក់។',
  'user.payment.subscriptionIdRequired': 'ត្រូវការ subscriptionId។',
  'user.payment.receiptAndPlanRequired': 'ត្រូវការ receipt និង planKey។',
  'user.payment.verificationNotConfigured':
    'ការផ្ទៀងផ្ទាត់ការបង់ប្រាក់មិនត្រូវបានកំណត់រចនាសម្ព័ន្ធសម្រាប់ {{provider}}។',
  'user.payment.invalidPlan': 'គម្រោងមិនត្រឹមត្រូវ។',
  'user.payment.verificationFailed': 'បរាជ័យក្នុងការផ្ទៀងផ្ទាត់ការជាវ។',
  'user.payment.unknownPlan': 'គម្រោងមិនស្គាល់។',
  'user.payment.invalidWebhookEvent': 'ព្រឹត្តិការណ៍ webhook មិនត្រឹមត្រូវ។',
}
