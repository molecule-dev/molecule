import type { ProjectTranslations } from './types.js'

/** Project translations for Korean. */
export const ko: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'name과 projectType은 필수입니다',
  'project.error.notFound': '찾을 수 없습니다',
  'project.error.forbidden': '접근 불가',
  'project.error.createFailed': '프로젝트 생성에 실패했습니다.',
  'project.error.invalidType':
    '지원되지 않는 projectType입니다. 다음 중 하나가 필요합니다: api, app, full-stack, static, status-page, status-page-edge',
  'project.error.deleteFailed': '프로젝트 삭제에 실패했습니다',
  'project.error.listFailed': '프로젝트 목록을 불러오는 데 실패했습니다.',
  'project.error.readFailed': '프로젝트를 읽는 데 실패했습니다.',
  'project.error.updateFailed': '프로젝트 업데이트에 실패했습니다.',
}
