import type { StatusTranslations } from './types.js'

/** Status translations for Arabic. */
export const ar: StatusTranslations = {
  'status.error.serviceNotFound': 'الخدمة غير موجودة.',
  'status.error.incidentNotFound': 'الحادثة غير موجودة.',
  'status.error.validationFailed': 'فشل التحقق: {{errors}}',
  'status.error.createServiceFailed': 'فشل إنشاء الخدمة.',
  'status.error.updateServiceFailed': 'فشل تحديث الخدمة.',
  'status.error.deleteServiceFailed': 'فشل حذف الخدمة.',
  'status.error.getServiceFailed': 'فشل جلب الخدمة.',
  'status.error.listServicesFailed': 'فشل سرد الخدمات.',
  'status.error.createIncidentFailed': 'فشل إنشاء الحادثة.',
  'status.error.updateIncidentFailed': 'فشل تحديث الحادثة.',
  'status.error.listIncidentsFailed': 'فشل سرد الحوادث.',
  'status.error.getStatusFailed': 'فشل جلب حالة النظام.',
  'status.error.getUptimeFailed': 'فشل جلب بيانات وقت التشغيل.',
}
