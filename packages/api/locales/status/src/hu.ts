import type { StatusTranslations } from './types.js'

/** Status translations for Hungarian. */
export const hu: StatusTranslations = {
  'status.error.serviceNotFound': 'Szolgáltatás nem található.',
  'status.error.incidentNotFound': 'Incidens nem található.',
  'status.error.validationFailed': 'Érvényesítés sikertelen: {{errors}}',
  'status.error.createServiceFailed': 'Szolgáltatás létrehozása sikertelen.',
  'status.error.updateServiceFailed': 'Szolgáltatás frissítése sikertelen.',
  'status.error.deleteServiceFailed': 'Szolgáltatás törlése sikertelen.',
  'status.error.getServiceFailed': 'Szolgáltatás lekérése sikertelen.',
  'status.error.listServicesFailed': 'Szolgáltatások listázása sikertelen.',
  'status.error.createIncidentFailed': 'Incidens létrehozása sikertelen.',
  'status.error.updateIncidentFailed': 'Incidens frissítése sikertelen.',
  'status.error.listIncidentsFailed': 'Incidensek listázása sikertelen.',
  'status.error.getStatusFailed': 'Rendszerállapot lekérése sikertelen.',
  'status.error.getUptimeFailed': 'Rendelkezésre állási adatok lekérése sikertelen.',
}
