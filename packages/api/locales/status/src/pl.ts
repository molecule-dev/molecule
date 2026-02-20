import type { StatusTranslations } from './types.js'

/** Status translations for Polish. */
export const pl: StatusTranslations = {
  'status.error.serviceNotFound': 'Usługa nie znaleziona.',
  'status.error.incidentNotFound': 'Incydent nie znaleziony.',
  'status.error.validationFailed': 'Walidacja nieudana: {{errors}}',
  'status.error.createServiceFailed': 'Nie udało się utworzyć usługi.',
  'status.error.updateServiceFailed': 'Nie udało się zaktualizować usługi.',
  'status.error.deleteServiceFailed': 'Nie udało się usunąć usługi.',
  'status.error.getServiceFailed': 'Nie udało się pobrać usługi.',
  'status.error.listServicesFailed': 'Nie udało się wyświetlić listy usług.',
  'status.error.createIncidentFailed': 'Nie udało się utworzyć incydentu.',
  'status.error.updateIncidentFailed': 'Nie udało się zaktualizować incydentu.',
  'status.error.listIncidentsFailed': 'Nie udało się wyświetlić listy incydentów.',
  'status.error.getStatusFailed': 'Nie udało się pobrać statusu systemu.',
  'status.error.getUptimeFailed': 'Nie udało się pobrać danych o dostępności.',
}
