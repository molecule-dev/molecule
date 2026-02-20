import type { StatusTranslations } from './types.js'

/** Status translations for Turkish. */
export const tr: StatusTranslations = {
  'status.error.serviceNotFound': 'Hizmet bulunamadı.',
  'status.error.incidentNotFound': 'Olay bulunamadı.',
  'status.error.validationFailed': 'Doğrulama başarısız: {{errors}}',
  'status.error.createServiceFailed': 'Hizmet oluşturulamadı.',
  'status.error.updateServiceFailed': 'Hizmet güncellenemedi.',
  'status.error.deleteServiceFailed': 'Hizmet silinemedi.',
  'status.error.getServiceFailed': 'Hizmet alınamadı.',
  'status.error.listServicesFailed': 'Hizmetler listelenemedi.',
  'status.error.createIncidentFailed': 'Olay oluşturulamadı.',
  'status.error.updateIncidentFailed': 'Olay güncellenemedi.',
  'status.error.listIncidentsFailed': 'Olaylar listelenemedi.',
  'status.error.getStatusFailed': 'Sistem durumu alınamadı.',
  'status.error.getUptimeFailed': 'Çalışma süresi verileri alınamadı.',
}
