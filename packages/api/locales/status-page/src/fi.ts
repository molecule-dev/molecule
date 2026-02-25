import type { StatusTranslations } from './types.js'

/** Status translations for Finnish. */
export const fi: StatusTranslations = {
  'status.error.serviceNotFound': 'Palvelua ei löytynyt.',
  'status.error.incidentNotFound': 'Tapahtumaa ei löytynyt.',
  'status.error.validationFailed': 'Validointi epäonnistui: {{errors}}',
  'status.error.createServiceFailed': 'Palvelun luominen epäonnistui.',
  'status.error.updateServiceFailed': 'Palvelun päivittäminen epäonnistui.',
  'status.error.deleteServiceFailed': 'Palvelun poistaminen epäonnistui.',
  'status.error.getServiceFailed': 'Palvelun hakeminen epäonnistui.',
  'status.error.listServicesFailed': 'Palveluiden listaaminen epäonnistui.',
  'status.error.createIncidentFailed': 'Tapahtuman luominen epäonnistui.',
  'status.error.updateIncidentFailed': 'Tapahtuman päivittäminen epäonnistui.',
  'status.error.listIncidentsFailed': 'Tapahtumien listaaminen epäonnistui.',
  'status.error.getStatusFailed': 'Järjestelmän tilan hakeminen epäonnistui.',
  'status.error.getUptimeFailed': 'Käytettävyystietojen hakeminen epäonnistui.',
}
