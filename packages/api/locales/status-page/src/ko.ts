import type { StatusTranslations } from './types.js'

/** Status translations for Korean. */
export const ko: StatusTranslations = {
  'status.error.serviceNotFound': '서비스를 찾을 수 없습니다.',
  'status.error.incidentNotFound': '인시던트를 찾을 수 없습니다.',
  'status.error.validationFailed': '유효성 검사 실패: {{errors}}',
  'status.error.createServiceFailed': '서비스 생성에 실패했습니다.',
  'status.error.updateServiceFailed': '서비스 업데이트에 실패했습니다.',
  'status.error.deleteServiceFailed': '서비스 삭제에 실패했습니다.',
  'status.error.getServiceFailed': '서비스 조회에 실패했습니다.',
  'status.error.listServicesFailed': '서비스 목록 조회에 실패했습니다.',
  'status.error.createIncidentFailed': '인시던트 생성에 실패했습니다.',
  'status.error.updateIncidentFailed': '인시던트 업데이트에 실패했습니다.',
  'status.error.listIncidentsFailed': '인시던트 목록 조회에 실패했습니다.',
  'status.error.getStatusFailed': '시스템 상태 조회에 실패했습니다.',
  'status.error.getUptimeFailed': '가동 시간 데이터 조회에 실패했습니다.',
}
