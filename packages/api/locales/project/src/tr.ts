import type { ProjectTranslations } from './types.js'

/** Project translations for Turkish. */
export const tr: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'name ve projectType gereklidir',
  'project.error.notFound': 'Bulunamadı',
  'project.error.forbidden': 'Erişim engellendi',
  'project.error.createFailed': 'Proje oluşturulamadı.',
  'project.error.invalidType':
    'Desteklenmeyen proje türü; şu seçeneklerden biri bekleniyordu: api, app, full-stack, static, status-page, status-page-edge',
  'project.error.deleteFailed': 'Proje silme işlemi başarısız oldu.',
  'project.error.listFailed': 'Projeleri listelemek başarısız oldu.',
  'project.error.readFailed': 'Projeyi okuyamadım.',
  'project.error.updateFailed': 'Proje güncellenemedi.',
}
