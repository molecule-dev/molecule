import type { StatusTranslations } from './types.js'

/** Status translations for Latvian. */
export const lv: StatusTranslations = {
  'status.error.serviceNotFound': 'Pakalpojums nav atrasts.',
  'status.error.incidentNotFound': 'Incidents nav atrasts.',
  'status.error.validationFailed': 'Validācija neizdevās: {{errors}}',
  'status.error.createServiceFailed': 'Neizdevās izveidot pakalpojumu.',
  'status.error.updateServiceFailed': 'Neizdevās atjaunināt pakalpojumu.',
  'status.error.deleteServiceFailed': 'Neizdevās dzēst pakalpojumu.',
  'status.error.getServiceFailed': 'Neizdevās iegūt pakalpojumu.',
  'status.error.listServicesFailed': 'Neizdevās uzskaitīt pakalpojumus.',
  'status.error.createIncidentFailed': 'Neizdevās izveidot incidentu.',
  'status.error.updateIncidentFailed': 'Neizdevās atjaunināt incidentu.',
  'status.error.listIncidentsFailed': 'Neizdevās uzskaitīt incidentus.',
  'status.error.getStatusFailed': 'Neizdevās iegūt sistēmas statusu.',
  'status.error.getUptimeFailed': 'Neizdevās iegūt darbības laika datus.',
}
