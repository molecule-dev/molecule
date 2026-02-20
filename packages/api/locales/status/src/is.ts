import type { StatusTranslations } from './types.js'

/** Status translations for Icelandic. */
export const is: StatusTranslations = {
  'status.error.serviceNotFound': 'Þjónusta fannst ekki.',
  'status.error.incidentNotFound': 'Atvik fannst ekki.',
  'status.error.validationFailed': 'Staðfesting mistókst: {{errors}}',
  'status.error.createServiceFailed': 'Ekki tókst að búa til þjónustu.',
  'status.error.updateServiceFailed': 'Ekki tókst að uppfæra þjónustu.',
  'status.error.deleteServiceFailed': 'Ekki tókst að eyða þjónustu.',
  'status.error.getServiceFailed': 'Ekki tókst að sækja þjónustu.',
  'status.error.listServicesFailed': 'Ekki tókst að skrá þjónustur.',
  'status.error.createIncidentFailed': 'Ekki tókst að búa til atvik.',
  'status.error.updateIncidentFailed': 'Ekki tókst að uppfæra atvik.',
  'status.error.listIncidentsFailed': 'Ekki tókst að skrá atvik.',
  'status.error.getStatusFailed': 'Ekki tókst að sækja kerfisstöðu.',
  'status.error.getUptimeFailed': 'Ekki tókst að sækja rekstrartímagögn.',
}
