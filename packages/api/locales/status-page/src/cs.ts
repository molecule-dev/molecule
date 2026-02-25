import type { StatusTranslations } from './types.js'

/** Status translations for Czech. */
export const cs: StatusTranslations = {
  'status.error.serviceNotFound': 'Služba nenalezena.',
  'status.error.incidentNotFound': 'Incident nenalezen.',
  'status.error.validationFailed': 'Ověření selhalo: {{errors}}',
  'status.error.createServiceFailed': 'Nepodařilo se vytvořit službu.',
  'status.error.updateServiceFailed': 'Nepodařilo se aktualizovat službu.',
  'status.error.deleteServiceFailed': 'Nepodařilo se smazat službu.',
  'status.error.getServiceFailed': 'Nepodařilo se načíst službu.',
  'status.error.listServicesFailed': 'Nepodařilo se vypsat služby.',
  'status.error.createIncidentFailed': 'Nepodařilo se vytvořit incident.',
  'status.error.updateIncidentFailed': 'Nepodařilo se aktualizovat incident.',
  'status.error.listIncidentsFailed': 'Nepodařilo se vypsat incidenty.',
  'status.error.getStatusFailed': 'Nepodařilo se načíst stav systému.',
  'status.error.getUptimeFailed': 'Nepodařilo se načíst data o dostupnosti.',
}
