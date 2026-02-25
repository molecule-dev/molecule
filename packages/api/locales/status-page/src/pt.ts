import type { StatusTranslations } from './types.js'

/** Status translations for Portuguese. */
export const pt: StatusTranslations = {
  'status.error.serviceNotFound': 'Serviço não encontrado.',
  'status.error.incidentNotFound': 'Incidente não encontrado.',
  'status.error.validationFailed': 'Validação falhou: {{errors}}',
  'status.error.createServiceFailed': 'Falha ao criar serviço.',
  'status.error.updateServiceFailed': 'Falha ao atualizar serviço.',
  'status.error.deleteServiceFailed': 'Falha ao excluir serviço.',
  'status.error.getServiceFailed': 'Falha ao obter serviço.',
  'status.error.listServicesFailed': 'Falha ao listar serviços.',
  'status.error.createIncidentFailed': 'Falha ao criar incidente.',
  'status.error.updateIncidentFailed': 'Falha ao atualizar incidente.',
  'status.error.listIncidentsFailed': 'Falha ao listar incidentes.',
  'status.error.getStatusFailed': 'Falha ao obter status do sistema.',
  'status.error.getUptimeFailed': 'Falha ao obter dados de disponibilidade.',
}
