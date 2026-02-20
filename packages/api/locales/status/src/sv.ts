import type { StatusTranslations } from './types.js'

/** Status translations for Swedish. */
export const sv: StatusTranslations = {
  'status.error.serviceNotFound': 'Tjänst hittades inte.',
  'status.error.incidentNotFound': 'Incident hittades inte.',
  'status.error.validationFailed': 'Validering misslyckades: {{errors}}',
  'status.error.createServiceFailed': 'Kunde inte skapa tjänst.',
  'status.error.updateServiceFailed': 'Kunde inte uppdatera tjänst.',
  'status.error.deleteServiceFailed': 'Kunde inte ta bort tjänst.',
  'status.error.getServiceFailed': 'Kunde inte hämta tjänst.',
  'status.error.listServicesFailed': 'Kunde inte lista tjänster.',
  'status.error.createIncidentFailed': 'Kunde inte skapa incident.',
  'status.error.updateIncidentFailed': 'Kunde inte uppdatera incident.',
  'status.error.listIncidentsFailed': 'Kunde inte lista incidenter.',
  'status.error.getStatusFailed': 'Kunde inte hämta systemstatus.',
  'status.error.getUptimeFailed': 'Kunde inte hämta drifttidsdata.',
}
