import type { StatusTranslations } from './types.js'

/** Status translations for Spanish. */
export const es: StatusTranslations = {
  'status.error.serviceNotFound': 'Servicio no encontrado.',
  'status.error.incidentNotFound': 'Incidente no encontrado.',
  'status.error.validationFailed': 'Validación fallida: {{errors}}',
  'status.error.createServiceFailed': 'Error al crear el servicio.',
  'status.error.updateServiceFailed': 'Error al actualizar el servicio.',
  'status.error.deleteServiceFailed': 'Error al eliminar el servicio.',
  'status.error.getServiceFailed': 'Error al obtener el servicio.',
  'status.error.listServicesFailed': 'Error al listar los servicios.',
  'status.error.createIncidentFailed': 'Error al crear el incidente.',
  'status.error.updateIncidentFailed': 'Error al actualizar el incidente.',
  'status.error.listIncidentsFailed': 'Error al listar los incidentes.',
  'status.error.getStatusFailed': 'Error al obtener el estado del sistema.',
  'status.error.getUptimeFailed': 'Error al obtener los datos de tiempo de actividad.',
}
